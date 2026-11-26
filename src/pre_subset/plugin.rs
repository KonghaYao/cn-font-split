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
/// 标签随分包对象移动，不再有「下标 -> 标签」的旁路表：创建者在分包入列时
/// 就把旧实现按下标查到的结果物化到对象上（规则见 [`LanguageArea::apply`]），
/// `AutoSubset` 读取它选择切分系数，拆分出的每个新分包继承同一标签。
///
/// 因此标签的取值含义是「**旧实现的按位置查表结果**」，而不是「这个分包属于
/// 哪个语言区域」：用户分包与余数包同样可能带标签。这是必须保留的历史语义，
/// 不能「修正」成只给语言区域分包打标签——那会改变 `AutoSubset` 的切分系数，
/// 进而改变分包数与产物字节。
///
/// `AutoSubset` 之后没有读取方；`ReduceMin` 产生的新包标签为 `None`。
pub struct Subset {
    pub chars: IndexSet<u32>,
    /// 旧实现按位置查表得到的区域标签；只有 `AutoSubset` 读取它。
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

/// 旧实现的按位置查表：`position` 是分包在 `draft.subsets` 中的**绝对下标**
/// （用户分包 → 语言区域分包 → 余数包），不是区域下标。
///
/// 返回 `None` 表示旧实现查到「空」（越界，或该区域为空）。
fn legacy_language_at(
    area_tags: &[Option<String>],
    position: usize,
) -> Option<String> {
    area_tags.get(position).cloned().flatten()
}

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
        // 完全一致。
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

        // 区域下标 -> 标签，只含非空区域；与旧实现 `used_languages` 的 key
        // 集合完全一致。
        let mut area_tags: Vec<Option<String>> =
            vec![None; language_area_tag.len()];
        for (index, _) in &extracted {
            if let Some(tag) = language_area_tag.get(*index) {
                area_tags[*index] = Some(tag.to_string());
            }
        }

        // 历史语义（**不能「修正」**）：旧实现按下标写
        // `used_languages[区域下标] = 标签`（只写非空区域），`AutoSubset` 却按
        // **分包在 `draft.subsets` 中的位置**去读。流水线保证
        // `AddUserSubset → LanguageArea → AddRemainChars → AutoSubset` 之间没有
        // 分包被删除（空包保留到最后），所以「创建时的位置」就是
        // 「`AutoSubset` 时的位置」，可以在此一次性物化：
        //
        // - 位置 `p` 命中非空区域的标签 ⇔ 该位置恰好是一个非空区域下标；
        // - 于是用户分包（位置 `0..base`）和余数包（位置 `base + L`）都可能
        //   意外命中某个区域标签，未命中才落到 `AutoSubset` 的 0.7 分支。
        //
        // 按「自己的区域标签」绑定会让标签与位置错位，改变切分系数与包数，
        // 产物不再逐字节等价。因此这里完整复刻按位置查表。
        let base = draft.subsets.len();
        // 已存在的分包（此时只有用户分包）也按绝对位置取标签。旧实现会把它们
        // 一并查表，所以它们同样可能命中。
        for (position, subset) in draft.subsets.iter_mut().enumerate() {
            subset.language = legacy_language_at(&area_tags, position);
        }
        for (ordinal, (_, chars)) in extracted.into_iter().enumerate() {
            let language = legacy_language_at(&area_tags, base + ordinal);
            draft.subsets.push(Subset { chars, language });
        }
        // 余数包在 `AddRemainChars` 里创建，把表交给它。
        draft.ctx.area_tags = area_tags;
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
        // 余数包同样按绝对位置查旧表：旧实现没有给它开例外，位置恰好是某个
        // 非空区域下标时就会命中该区域的标签（见 `LanguageArea::apply`）。
        let position = draft.subsets.len();
        let language = legacy_language_at(&draft.ctx.area_tags, position);
        draft
            .subsets
            .push(Subset { chars: v.iter().cloned().collect(), language });
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

    /// 按位置查表：命中、表内 `None`、越界、空表四种情况。
    #[test]
    fn legacy_language_lookup_is_positional() {
        let tags = vec![None, Some("ZH_TC".to_string())];
        assert_eq!(
            legacy_language_at(&tags, 1),
            Some("ZH_TC".to_string()),
            "命中非空区域下标"
        );
        assert_eq!(legacy_language_at(&tags, 0), None, "表内 None");
        assert_eq!(legacy_language_at(&tags, 2), None, "越界");
        assert_eq!(legacy_language_at(&[], 0), None, "language_areas 关闭");
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
