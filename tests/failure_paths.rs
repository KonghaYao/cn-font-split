//! v7 失败路径特征测试（characterization tests）。
//!
//! 目的：在重构前记录当前实现面对非法输入时的行为。Phase 2 会把这些
//! “panic/挂起”用例改为结构化错误，并同步修改本文件。
//!
//! 运行：
//! ```sh
//! cargo test --test failure_paths -- --nocapture
//! ```

use cn_font_proto::api_interface::InputTemplate;
use cn_font_split::font_split;

fn run(input: InputTemplate) {
    font_split(input, |_| {});
}

#[test]
#[should_panic(expected = "cn-font-split | pre_subset | read font file error")]
fn empty_input_panics() {
    run(InputTemplate {
        input: vec![],
        ..Default::default()
    });
}

#[test]
#[should_panic(expected = "cn-font-split | pre_subset | read font file error")]
fn random_bytes_panic() {
    run(InputTemplate {
        input: vec![0x13, 0x37, 0x00, 0x42, 0x99],
        ..Default::default()
    });
}

#[test]
#[should_panic(expected = "illegal woff2 file")]
fn truncated_woff2_panics() {
    let mut data = b"wOF2".to_vec();
    data.extend_from_slice(&[0u8; 16]);
    run(InputTemplate {
        input: data,
        ..Default::default()
    });
}

#[test]
#[should_panic(expected = "File length is not a multiple of 4")]
fn invalid_user_subsets_panic() {
    run(InputTemplate {
        input: include_bytes!("../packages/demo/public/WorkSans-VariableFont_wght.ttf")
            .to_vec(),
        subsets: vec![vec![1, 2, 3]],
        ..Default::default()
    });
}

/// v7 在 `chunk_size = 0` 时会在 `split_vector` 中死循环：
/// `max_count = 0` -> `length_for_index` 返回 0 -> `current_start` 不前进。
/// 该用例必须保持 `#[ignore]`，否则测试进程会挂起。
#[test]
#[ignore = "v7 hangs on chunk_size = 0"]
fn chunk_size_zero_hangs() {
    run(InputTemplate {
        input: include_bytes!("../packages/demo/public/WorkSans-VariableFont_wght.ttf")
            .to_vec(),
        chunk_size: Some(0),
        ..Default::default()
    });
}
