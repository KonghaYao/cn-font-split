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

/// 插件共享的可变状态：已生成的分包、尚未分配的字符、预处理上下文。
pub struct SubsetDraft<'d, 'a, 'b, 'c>
where
    'b: 'a,
    'c: 'a,
{
    pub subsets: Vec<IndexSet<u32>>,
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
        language_area
            .iter()
            .zip(language_area_tag.iter())
            .enumerate()
            .for_each(|(index, (area, tag))| {
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
                    draft.ctx.used_languages.insert(index, tag.to_string());
                    draft.subsets.push(set);
                }
            });
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
        draft.subsets.push(v.iter().cloned().collect());
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
fn reduce_min(subsets: &mut Vec<IndexSet<u32>>) {
    let min = 20;
    let max = 100;
    let mut cache: Vec<u32> = Vec::new();
    subsets.retain(|x| {
        if x.len() <= min {
            cache.extend(x.clone());
            return false;
        }
        true
    });
    let new_cache: Vec<IndexSet<u32>> = cache
        .chunks(max)
        .map(|x| x.iter().cloned().collect::<IndexSet<u32>>())
        .collect();
    subsets.extend(new_cache);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn set(range: std::ops::Range<u32>) -> IndexSet<u32> {
        range.collect()
    }

    /// 小包合并后字符集合不变、且没有重复字符。
    #[test]
    fn reduce_min_conserves_characters_without_duplicates() {
        let mut subsets = vec![
            set(0..20),    // 恰为阈值，被合并
            set(100..110), // 小包
            set(200..360), // 大包，保留
            set(400..415), // 小包
        ];
        let before: BTreeSet<u32> =
            subsets.iter().flat_map(|s| s.iter().copied()).collect();

        reduce_min(&mut subsets);

        let flattened: Vec<u32> =
            subsets.iter().flat_map(|s| s.iter().copied()).collect();
        let after: BTreeSet<u32> = flattened.iter().copied().collect();
        assert_eq!(before, after, "字符集合必须守恒");
        assert_eq!(flattened.len(), after.len(), "不得出现重复字符");
        // 20 + 10 + 15 = 45 个字符合成 1 个包；大包原样保留。
        assert_eq!(subsets.len(), 2);
        assert!(subsets.iter().any(|s| s.len() == 45));
        assert!(subsets.iter().any(|s| s.len() == 160));
    }

    /// 超过 100 字符的缓存按 100 重切，不丢不重。
    #[test]
    fn reduce_min_chunks_large_cache() {
        let mut subsets: Vec<IndexSet<u32>> =
            (0..6).map(|i| set(i * 20..i * 20 + 20)).collect();
        let before: BTreeSet<u32> =
            subsets.iter().flat_map(|s| s.iter().copied()).collect();

        reduce_min(&mut subsets);

        let flattened: Vec<u32> =
            subsets.iter().flat_map(|s| s.iter().copied()).collect();
        let after: BTreeSet<u32> = flattened.iter().copied().collect();
        assert_eq!(before, after);
        assert_eq!(flattened.len(), after.len());
        assert_eq!(
            subsets.iter().map(|s| s.len()).collect::<Vec<_>>(),
            vec![100, 20]
        );
    }
}
