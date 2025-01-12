use super::PreSubsetContext;
use std::collections::BTreeSet;

// 添加用户的 subsets 到第一位
pub fn plugin_add_user_subset(
    subsets: &mut Vec<BTreeSet<u32>>,
    _remaining_chars_set: &mut BTreeSet<u32>,
    ctx: &mut PreSubsetContext,
) {
    print!("{:#?}", ctx.subsets);
    ctx.subsets.iter().for_each(|u32_arr: &Vec<u32>| {
        let mut subset: BTreeSet<u32> = BTreeSet::new();
        u32_arr.iter().for_each(|x| {
            subset.insert(x.clone());
            _remaining_chars_set.remove(x);
        });
        subsets.push(subset);
    });
}
