use std::collections::{HashMap, HashSet};

use indexmap::IndexSet;

use log::{debug, info};

use crate::run_subset::build_single_subset;

use super::PreSubsetContext;

pub fn plugin_auto_subset(
    subsets: &mut Vec<IndexSet<u32>>,
    _remaining_chars_set: &mut HashSet<u32>,
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

    info!(
        "predict subset: {}/subset, {} bytes/char, {}(chunk_size)",
        bytes_per_char, chars_per_subset, ctx.predict_bytes_pre_subset
    );
    let mut count: usize = 0;
    let mut new_used_languages = HashMap::new();
    let new_subsets = subsets
        .iter()
        .enumerate()
        .flat_map(|(index, subset)| {
            let res = split_vector(subset, chars_per_subset);
            if let Some(language) = ctx.used_languages.get(&index) {
                for _ in 0..res.len() {
                    new_used_languages.insert(count, language.clone());
                    count += 1;
                }
            }
            res
        })
        .collect::<Vec<IndexSet<u32>>>();
    subsets.clear();
    for i in new_subsets {
        subsets.push(i);
    }
    // new_used_languages.iter().for_each(|(index, name)| {
    //     info!("subset: {} {} {}", index, name, subsets[*index].len());
    // });
    ctx.used_languages = new_used_languages;
}

// 计算当前包需要容纳多少个字符 y= max_count/ x^(1/3)
fn length_for_index(x: usize, max_count: u32) -> usize {
    let y: f32 = (max_count as f32) / (x as f32).cbrt(); // 计算立方根并求解y
    let y_ceil = y.ceil(); // 将结果向上取整
    y_ceil as usize
}
fn split_vector(vec: &IndexSet<u32>, max_count: u32) -> Vec<IndexSet<u32>> {
    let mut result: Vec<IndexSet<u32>> = Vec::new();
    let mut current_start = 0;
    let size = vec.len();

    for i in 1.. {
        if current_start >= size {
            debug!("fold {} -> {} | max {}", size, i - 1, max_count);
            break;
        }
        let len = length_for_index(i, max_count);
        // println!("{}", len);
        let to_take = std::cmp::min(len, size - current_start);
        let new_sub_vec = IndexSet::from_iter(
            vec[current_start..current_start + to_take].iter().cloned(),
        );
        result.push(new_sub_vec);
        current_start += to_take;
    }

    result
}
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_vector_empty_input_empty_result() {
        let input = IndexSet::new();
        let result = split_vector(&input, 150);
        assert!(result.is_empty());
    }

    #[test]
    fn split_vector_single_element_single_element_result() {
        let mut input = IndexSet::new();
        for x in 1..10 {
            input.insert(x);
        }
        let result = split_vector(&input, 150);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], input);
        // println!("result: {:?}", result)
    }

    #[test]
    fn split_vector_multiple_elements_multiple_subsets() {
        let mut input = IndexSet::new();
        for x in 1..400 {
            input.insert(x);
        }
        let result = split_vector(&input, 150);
        println!("result: {:#?}", result);
        assert_eq!(result.len(), 4);
    }
}

/// 每隔 n 个元素抽取一个元素
fn extract_every_nth<T: Clone>(set: &HashSet<T>, n: usize) -> Vec<T> {
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
    let mut set = HashSet::new();
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
