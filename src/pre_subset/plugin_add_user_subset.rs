use std::collections::HashSet;

use super::PreSubsetContext;
use indexmap::IndexSet;

// 添加用户的 subsets 到第一位
pub fn plugin_add_user_subset(
    subsets: &mut Vec<IndexSet<u32>>,
    _remaining_chars_set: &mut HashSet<u32>,
    ctx: &mut PreSubsetContext,
) {
    ctx.subsets.iter().for_each(|u32_arr: &Vec<u32>| {
        let mut subset: IndexSet<u32> = IndexSet::new();
        u32_arr.iter().for_each(|x| {
            subset.insert(x.clone());
            _remaining_chars_set.remove(x);
        });
        subsets.push(subset);
    });
}
