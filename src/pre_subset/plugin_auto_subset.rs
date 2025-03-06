use std::collections::{HashMap, HashSet};

use indexmap::IndexSet;

use log::{debug, info};

use crate::run_subset::build_single_subset;

use super::PreSubsetContext;

#[derive(Copy, Clone, Debug)]
pub enum OptLevel {
    NO = 0,
    LOW = 1,
    MID = 2,
    HIGH = 3,
}

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
        chars_per_subset, bytes_per_char, ctx.predict_bytes_pre_subset
    );
    let mut count: usize = 0;
    let mut new_used_languages = HashMap::new();
    // 后期用于区分算法，现在暂时无用
    let opt_level = match size {
        0..1000 => OptLevel::NO,
        1000..=10000 => OptLevel::LOW,
        10001..=30000 => OptLevel::MID,
        _ => OptLevel::HIGH,
    };
    let new_subsets = subsets
        .iter()
        .enumerate()
        .flat_map(|(index, subset)| {
            let lang = ctx.used_languages.get(&index);
            let res = match lang {
                // 繁体中文一般比简体中文要大一倍复杂度，故进行特殊处理
                Some(ref i) if *i == "ZH_TC" => {
                    // 特殊处理ZH_CN的情况
                    split_vector(
                        subset,
                        ((chars_per_subset as f32) * 0.5_f32) as u32,
                        opt_level,
                    ) // 假设对ZH_CN有不一样的处理逻辑
                }
                None => {
                    return split_vector(
                        subset,
                        ((chars_per_subset as f32) * 0.7_f32) as u32,
                        opt_level,
                    );
                }
                _ => split_vector(subset, chars_per_subset, opt_level),
            };
            if let Some(language) = lang {
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
fn length_for_index(x: usize, max_count: u32, level: OptLevel) -> usize {
    let min_count = (max_count / 5) as u32;
    let y: f32 = match level {
        OptLevel::NO => (min_count as f32) * (x as f32),
        OptLevel::LOW => (min_count as f32) * (x as f32).sqrt(),
        OptLevel::MID => (min_count as f32) * (x as f32).cbrt(),
        OptLevel::HIGH => (min_count as f32) * (x as f32).cbrt(),
    }; // 计算立方根并求解y
    let y_ceil = y.ceil(); // 将结果向上取整
                           // 不能比 max_count 的 1/5 小
    std::cmp::min(y_ceil as usize, (max_count) as usize)
}
fn split_vector(
    vec: &IndexSet<u32>,
    max_count: u32,
    level: OptLevel,
) -> Vec<IndexSet<u32>> {
    let mut result: Vec<IndexSet<u32>> = Vec::new();
    let mut current_start = 0;
    let size = vec.len();

    for i in 1.. {
        if current_start >= size {
            debug!("fold {} -> {} | max {}", size, i - 1, max_count);
            break;
        }
        let len = length_for_index(i, max_count, level.clone());
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
        let result = split_vector(&input, 150, OptLevel::LOW);
        assert!(result.is_empty());
    }

    #[test]
    fn split_vector_single_element_single_element_result() {
        let mut input = IndexSet::new();
        for x in 1..10 {
            input.insert(x);
        }
        let result = split_vector(&input, 150, OptLevel::LOW);
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
        let result = split_vector(&input, 150, OptLevel::LOW);
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
