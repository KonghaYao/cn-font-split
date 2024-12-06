use std::collections::BTreeSet;

use log::info;

use crate::run_subset::build_single_subset;

use super::PreSubsetContext;

pub fn auto_subset_plugin(
    subsets: &mut Vec<BTreeSet<u32>>,
    _remaining_chars_set: &mut BTreeSet<u32>,
    ctx: &mut PreSubsetContext,
) {
    let size = ctx.all_unicodes.len();
    let space: usize = (size / 100).min(1);
    let sample = extract_every_nth(&ctx.all_unicodes, space);
    let result = build_single_subset(&ctx.face, &sample);
    let byte_length = result.len();
    let bytes_per_char = byte_length / sample.len();
    let chars_per_subset =
        ctx.predict_bytes_pre_subset / (bytes_per_char as u32);

    info!("{}, {}", bytes_per_char, chars_per_subset);
    let new_subsets = chunk_iterable_and_flat(subsets, chars_per_subset);
    subsets.clear();
    for i in new_subsets {
        subsets.push(i);
    }
}

/// 将集合中的每个子集进一步分割成大小不超过 `max_chunk_size` 的更小子集。
pub fn chunk_iterable_and_flat(
    subsets: &mut Vec<BTreeSet<u32>>,
    max_chunk_size: u32,
) -> Vec<BTreeSet<u32>> {
    let max_chunk_size = max_chunk_size - 1;
    subsets
        .iter()
        .flat_map(|subset| {
            let mut count = 0;
            let mut result: Vec<BTreeSet<u32>> = vec![];
            let mut new_subset: BTreeSet<u32> = BTreeSet::new();
            subset.iter().for_each(|c| {
                new_subset.insert(c.clone());
                if count >= max_chunk_size {
                    count = 0;
                    result.push(new_subset.clone());
                    new_subset = BTreeSet::new();
                } else {
                    count += 1;
                }
            });
            if new_subset.len() > 0 {
                result.push(new_subset)
            };
            result
        })
        .collect::<Vec<BTreeSet<u32>>>()
}

#[test]
fn for_chunk_iterable_and_flat() {
    let mut subsets = vec![
        BTreeSet::from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        BTreeSet::from([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]),
    ];
    let result = chunk_iterable_and_flat(&mut subsets, 5);
    assert_eq!(
        result,
        vec![
            BTreeSet::from([1, 2, 3, 4, 5]),
            BTreeSet::from([6, 7, 8, 9, 10]),
            BTreeSet::from([11, 12, 13, 14, 15]),
            BTreeSet::from([16, 17, 18, 19, 20]),
            BTreeSet::from([21]),
        ]
    );
}

/// 每隔 n 个元素抽取一个元素
fn extract_every_nth<T: Clone>(set: &BTreeSet<T>, n: usize) -> Vec<T> {
    // 检查 n 是否有效
    let n = if n == 0 { 1_usize } else { n };

    // 创建一个新的向量用于存储结果
    let mut result = Vec::new();

    // 遍历向量，每隔 n 个元素抽取一个元素
    for (index, value) in set.iter().enumerate() {
        if index % n == 0 {
            result.push(value.clone());
        }
    }
    result
}
#[test]
fn main() {
    let mut set = BTreeSet::new();
    set.insert(1);
    set.insert(2);
    set.insert(3);
    set.insert(4);
    set.insert(5);
    set.insert(6);
    set.insert(7);
    set.insert(8);

    let extracted = extract_every_nth(&set, 2);
    assert_eq!(extracted, vec![1, 3, 5, 7]);
}
