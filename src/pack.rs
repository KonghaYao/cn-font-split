//! 单包构建：把一组码点打包成一个 woff2 字体。
//!
//! 该实现被两个阶段复用——`pre_subset` 的自动分包估算需要真实压缩体积，
//! `run_subset` 需要产出最终文件。放在独立的叶子模块里，避免
//! `pre_subset → run_subset` 的实现依赖。

use crate::error::{FontSplitError, Result};
use harfbuzz_rs_now::subset::Subset;
use harfbuzz_rs_now::{Face, Owned};
use woff::version2::compress;

/// 构建单个分包为字体文件
pub fn build_single_subset(
    face: &Owned<Face>,
    subset: &[u32],
) -> Result<Vec<u8>> {
    let subset_runner = Subset::new();
    subset_runner.clear_drop_table();
    subset_runner.adjust_layout();
    subset_runner.add_chars(subset);
    let new_face = subset_runner.run_subset(face).face_data();
    let ttf_binary = new_face.get_data();
    // woff 0.4.0 的 compress 以 Option 表示失败（上游 woff2 编码失败）。
    compress(ttf_binary, String::from(""), 1, true).ok_or_else(|| {
        FontSplitError::Internal(format!(
            "WOFF2 压缩失败（{} 个字符）",
            subset.len()
        ))
    })
}
