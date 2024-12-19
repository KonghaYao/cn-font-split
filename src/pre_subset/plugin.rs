use std::collections::BTreeSet;

use lang_unicodes::create_default_unicode_area;
use log::info;

use super::PreSubsetContext;

pub fn language_area_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
    _ctx: &mut PreSubsetContext,
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
    _ctx: &mut PreSubsetContext,
) {
    info!("{} 个剩余字符被处理", remaining_chars_set.len());
    subsets.push(remaining_chars_set.clone());
    remaining_chars_set.clear();
}

/// 把数量低于某个值的包，重新规划，缩减碎片分包数
pub fn reduce_min_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    remaining_chars_set: &mut BTreeSet<u32>,
    _ctx: &mut PreSubsetContext,
) {
    // TODO 抽取为定义
    let min = 10;
    let max = 100;
    let mut cache: Vec<u32> = Vec::new();
    subsets.retain(|x| {
        if x.len() <= min {
            cache.extend(x.clone());
            return false;
        }
        return true;
    });
    let new_cache: Vec<BTreeSet<u32>> = cache
        .chunks(max)
        .map(|x| x.iter().cloned().collect::<BTreeSet<u32>>())
        .collect();
    subsets.extend(new_cache);
}
