use std::collections::BTreeSet;

pub fn add_remain_chars_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
) {
    subsets.push(remaining_chars_set.clone());
}
pub fn auto_subset_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
) {
    let new_subsets = subsets
        .iter()
        .flat_map(|subset| {
            let mut count = 0;
            let mut result: Vec<BTreeSet<u32>> = vec![];
            let mut new_subset: BTreeSet<u32> = BTreeSet::new();
            subset.iter().for_each(|c| {
                new_subset.insert(c.clone());
                if (count >= 80) {
                    count = 0;
                    result.push(new_subset.clone());
                    new_subset = BTreeSet::new();
                } else {
                    count += 1;
                }
            });
            result
        })
        .collect::<Vec<BTreeSet<u32>>>();
    subsets.clear();
    for i in new_subsets {
        subsets.push(i);
    }
}
