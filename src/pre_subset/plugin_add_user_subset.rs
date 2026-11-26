use indexmap::IndexSet;

use super::plugin::{Config, PreSubsetPlugin, SubsetDraft};
use crate::error::Result;

/// 把用户传入的 subsets 放到分包列表最前面。
pub struct AddUserSubset;

impl PreSubsetPlugin for AddUserSubset {
    fn name(&self) -> &'static str {
        "add_user_subset"
    }

    fn enabled(&self, _config: &Config) -> bool {
        // 用户显式给定的分包没有开关，始终执行。
        true
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        // `subsets` 是 `&[Vec<u32>]`，先取出引用即可与 `draft` 的其他字段解耦。
        let user_subsets = draft.ctx.subsets;
        user_subsets.iter().for_each(|u32_arr: &Vec<u32>| {
            let mut subset: IndexSet<u32> = IndexSet::new();
            u32_arr.iter().for_each(|x| {
                subset.insert(*x);
                draft.remaining.remove(x);
            });
            draft.subsets.push(subset);
        });
        Ok(())
    }
}
