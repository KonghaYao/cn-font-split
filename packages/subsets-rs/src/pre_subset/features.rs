use cmap::analyze_cmap;
use gpos::analyze_gpos;
use gsub::analyze_gsub;
use std::collections::{BTreeSet, HashMap};

use super::PreSubsetContext;
pub mod cmap;
pub mod gpos;
pub mod gsub;
pub fn features_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
    ctx: &mut PreSubsetContext,
) {
    let cmap = analyze_cmap(ctx.font, ctx.font_file);
    let sub_map = analyze_gsub(ctx.font, ctx.font_file);
    let sub_map = turn_indics_to_unicode_set(sub_map, &cmap);
    move_feature_set_to_front(&sub_map, subsets);

    let pos_map = analyze_gpos(ctx.font, ctx.font_file);
    let pos_map = turn_indics_to_unicode_set(pos_map, &cmap);
    move_feature_set_to_front(&pos_map, subsets);
    ()
}

fn move_feature_set_to_front(
    feature_map: &Vec<BTreeSet<u32>>,
    subsets: &mut Vec<BTreeSet<u32>>,
) {
    for feature_set in feature_map {
        let mut have_coverage = false;
        for subset in subsets.into_iter() {
            if have_coverage {
                subset.retain(|x| !feature_set.contains(x));
            } else if has_intersection(feature_set, subset) {
                for x in feature_set.iter() {
                    subset.insert(x.clone());
                }
                have_coverage = true;
            }
        }
    }
}

/// 判断两个集合是否有交集
fn has_intersection(a: &BTreeSet<u32>, b: &BTreeSet<u32>) -> bool {
    for i in a {
        if b.contains(i) {
            return true;
        }
    }
    return false;
}

#[test]
fn test_move_feature_set_to_front() {
    let mut feature_map = vec![BTreeSet::from([1, 2]), BTreeSet::from([3, 4])];
    let mut subsets = vec![
        BTreeSet::from([2, 3]),
        BTreeSet::from([4, 5]),
        BTreeSet::from([1]),
    ];

    move_feature_set_to_front(&mut feature_map, &mut subsets);

    // println!("{:?}", subsets);
    assert!(subsets[0].contains(&1));
    assert!(subsets[0].contains(&2));
    assert!(subsets[0].contains(&3));
    assert!(subsets[0].contains(&4));
    assert!(subsets[1].contains(&5));
    assert!(subsets[2].is_empty());
}

pub fn turn_indics_to_unicode_set(
    all_maybe_relative_glyph: Vec<Vec<u16>>,
    cmap: &HashMap<u16, u32>,
) -> Vec<BTreeSet<u32>> {
    all_maybe_relative_glyph
        .iter()
        .map(|r| {
            BTreeSet::from_iter(
                r.iter().map(|gid| cmap.get(gid).unwrap_or(&0_u32).clone()),
            )
        })
        .collect::<Vec<BTreeSet<u32>>>()
}
