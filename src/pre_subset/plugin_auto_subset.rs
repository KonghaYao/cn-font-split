use std::collections::{BTreeSet, HashMap};

use indexmap::IndexSet;

use log::{debug, info};

use crate::pack::build_single_subset;

use super::plugin::{PreSubsetPlugin, SubsetDraft};
use crate::config::Config;
use crate::error::Result;

#[derive(Copy, Clone, Debug)]
pub enum OptLevel {
    No = 0,
    Low = 1,
    Mid = 2,
    High = 3,
}

/// 估算阶段的最大采样字符数：估算最多只 subset + 压缩 1000 个字符。
const SAMPLE_MAX_CHARS: usize = 1000;
/// 小采样点的目标字符数，与大采样点一起拟合压缩体积随字符数的缩放指数。
const SAMPLE_MIN_CHARS: usize = 100;

/// 压缩后体积的两点模型。
///
/// - `overhead` / `per_char`：线性差分得到的「固定开销 + 每字符边际字节」；
/// - `scale_exp`：总字节随字符数增长的幂律指数（`bytes ≈ c * n^scale_exp`）。
///
/// 采样压缩只能描述小规模区间：woff2/brotli 在更大规模上有明显的跨字形冗余
/// 收益（NotoSerifSC 全量约 236 字节/字符，1000 字符采样约 285 字节/字符）。
/// 若直接按采样平均值估算，`bytes_per_char` 会被小规模效应放大，分包数 +15%
/// 以上。这里用两点拟合出的指数把体积外推到字体的真实字符数，复现修复前
/// 「全字体平均字节」的估算语义，同时把估算采样量压到 1000 字符。
#[derive(Copy, Clone, Debug)]
struct SizeModel {
    overhead: f64,
    per_char: f64,
    scale_exp: f64,
}

impl SizeModel {
    /// 用两个不同规模的嵌套采样拟合。数据退化时返回 `None`，由调用方回退到单点平均。
    fn fit(
        small_chars: usize,
        small_bytes: usize,
        large_chars: usize,
        large_bytes: usize,
    ) -> Option<Self> {
        if small_chars == 0
            || large_chars <= small_chars
            || small_bytes == 0
            || large_bytes <= small_bytes
        {
            return None;
        }
        let per_char = (large_bytes - small_bytes) as f64
            / (large_chars - small_chars) as f64;
        if !per_char.is_finite() || per_char <= 0.0 {
            return None;
        }
        let overhead = small_bytes as f64 - per_char * small_chars as f64;
        let exp = (large_bytes as f64 / small_bytes as f64).ln()
            / (large_chars as f64 / small_chars as f64).ln();
        if !exp.is_finite() {
            return None;
        }
        // 指数限制在 [0.5, 1]：<0.5 会过度外推，>1 表示采样噪声（体积超线性增长）。
        Some(Self { overhead, per_char, scale_exp: exp.clamp(0.5, 1.0) })
    }

    /// 把大采样点的压缩体积外推到 `total_chars` 后的平均字节/字符。
    fn bytes_per_char_at(
        &self,
        large_chars: usize,
        large_bytes: usize,
        total_chars: usize,
    ) -> f64 {
        let total = total_chars.max(large_chars);
        let scale = (total as f64 / large_chars as f64).powf(self.scale_exp);
        large_bytes as f64 * scale / total as f64
    }
}

/// 由估算模型推算每个分包的字符数，并覆盖退化情况。
///
/// 说明：字面公式 `(target - overhead) / per_char` 会给每个分包预留一份固定
/// 开销（NotoSerifSC 约 4.4KB），实测分包数 +17%~24%，超出 S4 的
/// 「分包数增幅 ≤5%」约束，因此改用「外推到全字体规模的平均字节/字符」。
///
/// 兜底：
/// - 模型不可用（采样压缩反而更大、边际字节非正）时回退到单点平均；
/// - `bytes_per_char <= 0`、平均字节非有限时至少取 1 个字符，避免除零/死循环；
/// - `target` 连固定开销都覆盖不了时按边际字节退让，至少 1 个字符。
fn chars_for_target(
    model: Option<SizeModel>,
    total_chars: usize,
    sample_chars: usize,
    sample_bytes: usize,
    target_bytes: u32,
) -> u32 {
    let target = target_bytes as f64;
    // chunk_size 为 i32 上界时字符数可能溢出 u32，这里统一饱和。
    let clamp = |chars: f64| chars.min(u32::MAX as f64) as u32;
    if let Some(model) = model {
        if target <= model.overhead.max(0.0) {
            let chars = (target / model.per_char).floor();
            if chars.is_finite() && chars >= 1.0 {
                return clamp(chars);
            }
        } else {
            let bpc = model.bytes_per_char_at(
                sample_chars,
                sample_bytes,
                total_chars,
            );
            if bpc.is_finite() && bpc > 0.0 {
                return clamp((target / bpc).floor().max(1.0));
            }
        }
    }
    let avg = sample_bytes as f64 / sample_chars.max(1) as f64;
    if avg.is_finite() && avg > 0.0 {
        clamp((target / avg).floor().max(1.0))
    } else {
        1
    }
}

/// 按 `chunk_size` 目标体积自动切分已有分包。
pub struct AutoSubset;

impl PreSubsetPlugin for AutoSubset {
    fn name(&self) -> &'static str {
        "auto_subset"
    }

    fn enabled(&self, config: &Config) -> bool {
        config.auto_subset
    }

    fn apply(&self, draft: &mut SubsetDraft<'_, '_, '_, '_>) -> Result<()> {
        let ctx = &mut *draft.ctx;
        let subsets = &mut draft.subsets;
        let size = ctx.all_unicodes.len();
        // 旧实现 `space = (size / 100).min(1)` 恒等于 1，等于对全量字符做一次
        // subset + woff2 压缩（CJK 约 3 万字符、单次约 190ms），既是估算阶段的
        // 主要性能开销，也让固定开销完全被平摊掉。这里改为等距采样，
        // 采样上限 SAMPLE_MAX_CHARS 个字符。
        let sample = sample_unicodes(&ctx.all_unicodes);
        if sample.is_empty() {
            // 字体没有任何可映射字符时无法采样估算，直接跳过自动分包。
            return Ok(());
        }
        let mut model: Option<SizeModel> = None;
        let large_bytes;
        if sample.len() == size {
            // 字体字符数不超过采样上限：一次性压缩全量字符，结果与修复前一致。
            large_bytes = build_single_subset(ctx.face, &sample)?.len();
        } else {
            // 两点采样：小样本（约 100 字符）与大样本（≤1000 字符），共 2 次压缩。
            let small_step = (sample.len() / SAMPLE_MIN_CHARS).max(1);
            let small = sample
                .iter()
                .step_by(small_step)
                .copied()
                .collect::<Vec<u32>>();
            let small_bytes = build_single_subset(ctx.face, &small)?.len();
            large_bytes = build_single_subset(ctx.face, &sample)?.len();
            model = SizeModel::fit(
                small.len(),
                small_bytes,
                sample.len(),
                large_bytes,
            );
        }
        let chars_per_subset = chars_for_target(
            model,
            size,
            sample.len(),
            large_bytes,
            ctx.predict_bytes_pre_subset,
        );
        let (overhead, per_char, scale_exp) = match model {
            Some(m) => (m.overhead, m.per_char, m.scale_exp),
            None => (0.0, large_bytes as f64 / sample.len().max(1) as f64, 1.0),
        };

        info!(
            "predict subset: {}/subset, {:.2} bytes/char, overhead={:.0}, scale_exp={:.3}, {}(chunk_size)",
            chars_per_subset,
            per_char,
            overhead,
            scale_exp,
            ctx.predict_bytes_pre_subset
        );
        let mut count: usize = 0;
        let mut new_used_languages = HashMap::new();
        // 后期用于区分算法，现在暂时无用
        let opt_level = match size {
            0..1000 => OptLevel::No,
            1000..=10000 => OptLevel::Low,
            10001..=30000 => OptLevel::Mid,
            _ => OptLevel::High,
        };
        let new_subsets = subsets
            .iter()
            .enumerate()
            .flat_map(|(index, subset)| {
                let lang = ctx.used_languages.get(&index);
                let res = match lang {
                    // 繁体中文一般比简体中文要大一倍复杂度，故进行特殊处理
                    Some(i) if i == "ZH_TC" => split_vector(
                        subset,
                        ((chars_per_subset as f32) * 0.5_f32) as u32,
                        opt_level,
                    ),
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
        Ok(())
    }
}

// 计算当前包需要容纳多少个字符 y= max_count/ x^(1/3)
fn length_for_index(x: usize, max_count: u32, level: OptLevel) -> usize {
    let min_count = max_count / 5;
    // No 档固定按 5 倍下限分配；Low/Mid/High 都用立方根曲线（结果完全相同）。
    let y: f32 = match level {
        OptLevel::No => (min_count as f32) * 5_f32,
        _ => (min_count as f32) * (x as f32).cbrt(),
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
    // max_count 为 0（极小 chunk_size）会让每轮取 0 个字符、current_start
    // 永不前进而死循环；入口已拒绝 chunk_size <= 0，这里兜底每次至少取 1 个。
    let max_count = max_count.max(1);

    for i in 1.. {
        if current_start >= size {
            debug!("fold {} -> {} | max {}", size, i - 1, max_count);
            break;
        }
        let len = length_for_index(i, max_count, level).max(1);
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
        let result = split_vector(&input, 150, OptLevel::Low);
        assert!(result.is_empty());
    }

    #[test]
    fn split_vector_single_element_single_element_result() {
        let mut input = IndexSet::new();
        for x in 1..10 {
            input.insert(x);
        }
        let result = split_vector(&input, 150, OptLevel::Low);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], input);
    }

    #[test]
    fn split_vector_multiple_elements_multiple_subsets() {
        let mut input = IndexSet::new();
        for x in 1..400 {
            input.insert(x);
        }
        let result = split_vector(&input, 150, OptLevel::Low);
        assert_eq!(result.len(), 9);
    }

    #[test]
    fn sample_unicodes_caps_at_limit_and_keeps_small_sets() {
        let large: BTreeSet<u32> = (0..40_000).collect();
        let sample = sample_unicodes(&large);
        assert!(sample.len() <= SAMPLE_MAX_CHARS);
        assert!(sample.len() >= SAMPLE_MAX_CHARS * 9 / 10);
        assert_eq!(sample.first(), Some(&0));

        let small: BTreeSet<u32> = (0..10).collect();
        assert_eq!(sample_unicodes(&small).len(), 10);
        assert!(sample_unicodes(&BTreeSet::new()).is_empty());
    }

    #[test]
    fn size_model_fits_pure_linear_series() {
        // 20 字节/字符、无固定开销时，指数应恰好为 1。
        let model = SizeModel::fit(100, 2_000, 1_000, 20_000).unwrap();
        assert!((model.per_char - 20.0).abs() < 1e-9);
        assert!(model.overhead.abs() < 1e-9);
        assert!((model.scale_exp - 1.0).abs() < 1e-9);
    }

    #[test]
    fn size_model_rejects_degenerate_samples() {
        // 两点规模相同、体积不增、样本为空时都无法拟合。
        assert!(SizeModel::fit(100, 2_000, 100, 2_000).is_none());
        assert!(SizeModel::fit(100, 2_000, 1_000, 2_000).is_none());
        assert!(SizeModel::fit(0, 0, 1_000, 20_000).is_none());
    }

    #[test]
    fn chars_for_target_handles_degenerate_inputs() {
        // 固定开销吃掉预算：按边际字节退让。
        let model =
            SizeModel { overhead: 1_000.0, per_char: 10.0, scale_exp: 1.0 };
        assert_eq!(
            chars_for_target(Some(model), 10_000, 1_000, 11_000, 500),
            50
        );
        // 没有模型时按单点平均兜底。
        assert_eq!(chars_for_target(None, 1_000, 1_000, 20_000, 20_000), 1_000);
        // 压缩结果为 0 字节时至少返回 1 个字符，避免除零。
        assert_eq!(chars_for_target(None, 1_000, 1_000, 0, 20_000), 1);
    }

    #[test]
    fn chars_for_target_extrapolates_to_font_size() {
        // 100 字符采样 320B/字符、1000 字符采样 285B/字符：外推到 3 万字符规模
        // 后平均字节应低于采样平均，字符数应多于直接按采样平均值估算。
        let model = SizeModel::fit(100, 32_000, 1_000, 285_000).unwrap();
        let extrapolated =
            chars_for_target(Some(model), 30_928, 1_000, 285_000, 71_680);
        let naive = (71_680.0 / (285_000.0 / 1_000.0)) as u32;
        assert!(extrapolated > naive);
        assert!(extrapolated < 1_000);
    }
}

/// 等距采样最多 [`SAMPLE_MAX_CHARS`] 个字符。
fn sample_unicodes(set: &BTreeSet<u32>) -> Vec<u32> {
    let step = set.len().div_ceil(SAMPLE_MAX_CHARS).max(1);
    extract_every_nth(set, step)
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
