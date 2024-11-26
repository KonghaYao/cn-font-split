use std::collections::BTreeSet;

use lang_unicodes::create_default_unicode_area;
use log::info;

use super::PreSubsetContext;

pub fn language_area_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
    ctx: &mut PreSubsetContext,
) {
    let language_area = create_default_unicode_area();
    language_area.iter().for_each(|area| {
        let set = BTreeSet::from_iter(
            area.iter()
                .filter(|c| {
                    {
                        let is_in_remain = remaining_chars_set.contains(c);
                        // ! 副作用，从剩余字符中删除这个字符
                        remaining_chars_set.remove(c);
                        is_in_remain
                    }
                })
                .map(|c| c.clone()),
        );
        if set.len() > 0 {
            subsets.push(set);
        }
    });
}

pub fn add_remain_chars_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
    ctx: &mut PreSubsetContext,
) {
    info!("{} 个剩余字符被处理", remaining_chars_set.len());
    subsets.push(remaining_chars_set.clone());
    remaining_chars_set.clear();
}

// pub fn auto_subset_plugin(
//     subsets: &mut Vec<BTreeSet<u32>>,
//     _remaining_chars_set: &mut BTreeSet<u32>,
// ) {
//     let new_subsets = subsets
//         .iter()
//         .flat_map(|subset| {
//             let mut count = 0;
//             let mut result: Vec<BTreeSet<u32>> = vec![];
//             let mut new_subset: BTreeSet<u32> = BTreeSet::new();
//             subset.iter().for_each(|c| {
//                 new_subset.insert(c.clone());
//                 if count >= 160 {
//                     count = 0;
//                     result.push(new_subset.clone());
//                     new_subset = BTreeSet::new();
//                 } else {
//                     count += 1;
//                 }
//             });
//             result
//         })
//         .collect::<Vec<BTreeSet<u32>>>();
//     subsets.clear();
//     for i in new_subsets {
//         subsets.push(i);
//     }
// }
