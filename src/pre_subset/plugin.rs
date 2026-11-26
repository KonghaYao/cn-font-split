use std::collections::BTreeSet;

use cn_font_proto::api_interface::InputTemplate;
use indexmap::IndexSet;

use lang_unicodes::{
    create_default_unicode_area, create_default_unicode_area_tag,
};
use log::info;

use super::PreSubsetContext;
use crate::error::Result;

/// 预处理插件读取的配置类型。
///
/// 8.0 尚未引入独立的 `Config` 结构（见 `docs/PLAN-8.0-FOLLOWUPS.md` §A.5），
/// 这里先用别名把 trait 签名固定为 `&Config`；等默认值收拢进 `Config` 时
/// 只需替换别名，不必改动各插件。
pub type Config = InputTemplate;

/// 预处理插件。
///
/// 启用默认值只在各插件的 `enabled` 里出现一次（来自 `Config` 字段的
/// `unwrap_or`），顺序表不重复记录开关。
///
/// `Sync` 是 `PIPELINE` 能声明为 `static` 的前提，unit struct 天然满足。
pub trait PreSubsetPlugin: Sync {
    /// 稳定名称，用于顺序断言与日志定位。
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
        config.language_areas.unwrap_or(true)
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
        config.subset_remain_chars.unwrap_or(true)
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
        // 尚未调试好这个算法，所以默认不启用
        config.reduce_mins.unwrap_or(false)
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        let min = 20;
        let max = 100;
        let mut cache: Vec<u32> = Vec::new();
        draft.subsets.retain(|x| {
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
        draft.subsets.extend(new_cache);
        Ok(())
    }
}
