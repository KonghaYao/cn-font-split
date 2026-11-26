use std::collections::BTreeSet;

use indexmap::IndexSet;

use lang_unicodes::{
    create_default_unicode_area, create_default_unicode_area_tag,
};
use log::info;

use super::PreSubsetContext;
use crate::config::Config;
use crate::error::Result;

/// 预处理插件。
///
/// 启用开关读取 [`Config`] 中已解析的字段，默认值只在 `crate::config` 里
/// 定义一次，顺序表不重复记录开关。
///
/// `Sync` 是 `PIPELINE` 能声明为 `static` 的前提，unit struct 天然满足。
pub trait PreSubsetPlugin: Sync {
    /// 稳定名称，用于顺序断言与日志定位。
    ///
    /// 生产路径不读取名称（`PIPELINE` 的顺序由代码书写顺序保证），
    /// 只有 `pipeline_order_is_stable` 用它做顺序快照断言。
    #[allow(dead_code)]
    fn name(&self) -> &'static str;

    /// 是否启用本插件。
    fn enabled(&self, config: &Config) -> bool;

    /// 就地修改分包草稿。
    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()>;
}

/// 一个待处理的分包：字符集合 + 该分包携带的语言区域标签。
///
/// 标签随分包对象移动，不再有「下标 -> 标签」的旁路表：`LanguageArea`
/// 创建分包时把旧实现按下标读到的区域标签物化到对象上（规则见其 `apply`），
/// `AutoSubset` 读取它选择切分系数，拆分出的每个新分包继承同一标签。
/// 其它插件创建的分包标签为 `None`，且 `AutoSubset` 之后没有读取方。
pub struct Subset {
    pub chars: IndexSet<u32>,
    /// 分包携带的区域标签；只有 `AutoSubset` 读取它选择切分系数。
    pub language: Option<String>,
}

/// 插件共享的可变状态：已生成的分包、尚未分配的字符、预处理上下文。
pub struct SubsetDraft<'d, 'a, 'b, 'c>
where
    'b: 'a,
    'c: 'a,
{
    pub subsets: Vec<Subset>,
    pub remaining: BTreeSet<u32>,
    pub ctx: &'d mut PreSubsetContext<'a, 'b, 'c>,
}

/// 按语言区域把剩余字符拆成独立分包。
pub struct LanguageArea;

impl PreSubsetPlugin for LanguageArea {
    fn name(&self) -> &'static str {
        "language_area"
    }

    fn enabled(&self, config: &Config) -> bool {
        config.language_areas
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        let language_area = create_default_unicode_area();
        let language_area_tag = create_default_unicode_area_tag();
        // 先按区域抽出字符：顺序与「从 remaining 里摘字符」的副作用都与旧实现
        // 完全一致，只是不再把区域序号写进旁路表。
        let mut extracted: Vec<(usize, IndexSet<u32>)> = Vec::new();
        for (index, area) in language_area.iter().enumerate() {
            let set = IndexSet::from_iter(
                area.iter()
                    .filter(|c| {
                        let is_in_remain = draft.remaining.contains(*c);
                        // ! 副作用，从剩余字符中删除这个字符
                        draft.remaining.remove(*c);
                        is_in_remain
                    })
                    .copied(),
            );
            if !set.is_empty() {
                extracted.push((index, set));
            }
        }

        // 历史语义（**不能「修正」**）：旧实现把区域序号写进
        // `used_languages`，`AutoSubset` 却按分包下标去读，于是第 j 个语言
        // 分包（位置 `base + j`，`base` 是 `LanguageArea` 之前已有的分包数，
        // 通常来自用户分包）实际读到的是「区域 `base + j`」的标签：区域为空
        // 时错位，标签也可能属于另一个区域（NotoSerifSC 实测 ZH_SYMBOL 分包
        // 读到 ZH_TC、拿到 0.5 系数）。按「自己的区域标签」绑定会把该字体的
        // face 数从 179 改到 184，因此这里把旧下标查找的结果物化到分包对象上。
        let base = draft.subsets.len();
        let occupied_areas: BTreeSet<usize> =
            extracted.iter().map(|(index, _)| *index).collect();
        for (ordinal, (_, chars)) in extracted.into_iter().enumerate() {
            // 旧实现读取 `used_languages[base + ordinal]`：只有该位置恰好是
            // 非空区域下标时才有标签。
            let legacy_position = base + ordinal;
            let language = if occupied_areas.contains(&legacy_position) {
                Some(language_area_tag[legacy_position].to_string())
            } else {
                None
            };
            draft.subsets.push(Subset { chars, language });
        }
        Ok(())
    }
}

/// 把仍未分配的字符收进一个分包。
pub struct AddRemainChars;

impl PreSubsetPlugin for AddRemainChars {
    fn name(&self) -> &'static str {
        "add_remain_chars"
    }

    fn enabled(&self, config: &Config) -> bool {
        config.subset_remain_chars
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        info!("{} 个剩余字符被处理", draft.remaining.len());
        let mut v: Vec<u32> = draft.remaining.iter().cloned().collect();
        v.sort();
        draft.subsets.push(Subset {
            chars: v.iter().cloned().collect(),
            language: None,
        });
        draft.remaining.clear();
        Ok(())
    }
}

/// 把数量低于某个值的包，重新规划，缩减碎片分包数
pub struct ReduceMin;

impl PreSubsetPlugin for ReduceMin {
    fn name(&self) -> &'static str {
        "reduce_min"
    }

    fn enabled(&self, config: &Config) -> bool {
        // 尚未调试好这个算法，所以默认不启用（默认值见 crate::config）
        config.reduce_mins
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        reduce_min(&mut draft.subsets);
        Ok(())
    }
}

/// `ReduceMin` 的纯函数部分：合并 ≤20 字符的小包，再按 100 字符重切。
///
/// 只做搬移与重新分块，块内用 `IndexSet` 去重：字符既不丢失也不会重复。
///
/// 合并/重切出的新分包语言标签置 `None`：`ReduceMin` 位于 `AutoSubset` 之后，
/// `Subset::language` 已无读取方；保留下来的大包沿用原标签同样无人读取。
/// 标签不影响字符集合，这是有意的语义（不是遗漏）。
fn reduce_min(subsets: &mut Vec<Subset>) {
    let min = 20;
    let max = 100;
    let mut cache: Vec<u32> = Vec::new();
    subsets.retain(|x| {
        if x.chars.len() <= min {
            cache.extend(x.chars.iter().copied());
            return false;
        }
        true
    });
    let new_cache: Vec<Subset> = cache
        .chunks(max)
        .map(|x| Subset {
            chars: x.iter().cloned().collect::<IndexSet<u32>>(),
            language: None,
        })
        .collect();
    subsets.extend(new_cache);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set(range: std::ops::Range<u32>) -> IndexSet<u32> {
        range.collect()
    }

    fn subset(range: std::ops::Range<u32>) -> Subset {
        Subset { chars: set(range), language: None }
    }

    /// 小包合并后字符集合不变、且没有重复字符。
    #[test]
    fn reduce_min_conserves_characters_without_duplicates() {
        let mut subsets = vec![
            subset(0..20),    // 恰为阈值，被合并
            subset(100..110), // 小包
            subset(200..360), // 大包，保留
            subset(400..415), // 小包
        ];
        let before: BTreeSet<u32> =
            subsets.iter().flat_map(|s| s.chars.iter().copied()).collect();

        reduce_min(&mut subsets);

        let flattened: Vec<u32> =
            subsets.iter().flat_map(|s| s.chars.iter().copied()).collect();
        let after: BTreeSet<u32> = flattened.iter().copied().collect();
        assert_eq!(before, after, "字符集合必须守恒");
        assert_eq!(flattened.len(), after.len(), "不得出现重复字符");
        // 20 + 10 + 15 = 45 个字符合成 1 个包；大包原样保留。
        assert_eq!(subsets.len(), 2);
        assert!(subsets.iter().any(|s| s.chars.len() == 45));
        assert!(subsets.iter().any(|s| s.chars.len() == 160));
    }

    /// 超过 100 字符的缓存按 100 重切，不丢不重。
    #[test]
    fn reduce_min_chunks_large_cache() {
        let mut subsets: Vec<Subset> =
            (0..6).map(|i| subset(i * 20..i * 20 + 20)).collect();
        let before: BTreeSet<u32> =
            subsets.iter().flat_map(|s| s.chars.iter().copied()).collect();

        reduce_min(&mut subsets);

        let flattened: Vec<u32> =
            subsets.iter().flat_map(|s| s.chars.iter().copied()).collect();
        let after: BTreeSet<u32> = flattened.iter().copied().collect();
        assert_eq!(before, after);
        assert_eq!(flattened.len(), after.len());
        assert_eq!(
            subsets.iter().map(|s| s.chars.len()).collect::<Vec<_>>(),
            vec![100, 20]
        );
    }

    /// 合并/重切产生的新分包不带语言标签；标签不影响字符集合。
    #[test]
    fn reduce_min_drops_language_labels_without_touching_chars() {
        let mut subsets = vec![
            Subset { chars: set(0..5), language: Some("ZH_TC".to_string()) },
            Subset { chars: set(10..15), language: Some("LATIN".to_string()) },
            Subset {
                chars: set(100..360),
                language: Some("ZH_SC".to_string()),
            },
        ];
        let before: BTreeSet<u32> =
            subsets.iter().flat_map(|s| s.chars.iter().copied()).collect();

        reduce_min(&mut subsets);

        let after: BTreeSet<u32> =
            subsets.iter().flat_map(|s| s.chars.iter().copied()).collect();
        assert_eq!(before, after);
        // 两个小包合成一个 10 字符的新包，标签为 None。
        let merged =
            subsets.iter().find(|s| s.chars.len() == 10).expect("小包应被合并");
        assert!(merged.language.is_none());
        // 大包原样保留（标签保留但 AutoSubset 之后无读取方）。
        assert_eq!(subsets.iter().filter(|s| s.chars.len() == 260).count(), 1);
    }
}
