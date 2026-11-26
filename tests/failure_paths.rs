//! 失败路径测试：非法输入必须返回结构化错误，而不是 panic 或挂起。
//!
//! 运行：
//! ```sh
//! cargo test --test failure_paths -- --nocapture
//! ```

use cn_font_proto::api_interface::InputTemplate;
use cn_font_split::{FontSplitError, font_split};
use std::cell::Cell;
use std::time::{Duration, Instant};

/// 本地 fixture：合法的可变字体（仓库内的 demo 字体）。
const VALID_FONT: &[u8] =
    include_bytes!("../packages/demo/public/WorkSans-VariableFont_wght.ttf");

fn run(input: InputTemplate) -> Result<(), FontSplitError> {
    font_split(input, |_| {})
}

#[test]
fn empty_input_returns_empty_input_error() {
    let err = run(InputTemplate { input: vec![], ..Default::default() })
        .expect_err("空输入必须返回 Err");
    assert!(
        matches!(err, FontSplitError::EmptyInput),
        "期望 EmptyInput，实际为 {err:?}"
    );
}

#[test]
fn random_bytes_returns_invalid_font_error() {
    let err = run(InputTemplate {
        input: vec![0x13, 0x37, 0x00, 0x42, 0x99],
        ..Default::default()
    })
    .expect_err("非字体数据必须返回 Err");
    assert!(
        matches!(err, FontSplitError::InvalidFont(_)),
        "期望 InvalidFont，实际为 {err:?}"
    );
}

#[test]
fn truncated_woff2_returns_invalid_woff2_error() {
    let mut data = b"wOF2".to_vec();
    data.extend_from_slice(&[0u8; 16]);
    let err = run(InputTemplate { input: data, ..Default::default() })
        .expect_err("截断的 WOFF2 必须返回 Err");
    assert!(
        matches!(err, FontSplitError::InvalidWoff2(_)),
        "期望 InvalidWoff2，实际为 {err:?}"
    );
}

#[test]
fn invalid_user_subsets_returns_invalid_subsets_error() {
    let err = run(InputTemplate {
        input: VALID_FONT.to_vec(),
        subsets: vec![vec![1, 2, 3]],
        ..Default::default()
    })
    .expect_err("非 4 字节对齐的 subsets 必须返回 Err");
    assert!(
        matches!(err, FontSplitError::InvalidSubsets(_)),
        "期望 InvalidSubsets，实际为 {err:?}"
    );
}

/// v7 在 `chunk_size = 0` 时会在 `split_vector` 中死循环；
/// 8.0 必须在入口校验阶段直接拒绝。
#[test]
fn chunk_size_zero_returns_invalid_config_error() {
    let start = Instant::now();
    let err = run(InputTemplate {
        input: VALID_FONT.to_vec(),
        chunk_size: Some(0),
        ..Default::default()
    })
    .expect_err("chunk_size = 0 必须返回 Err");
    assert!(
        matches!(err, FontSplitError::InvalidConfig(_)),
        "期望 InvalidConfig，实际为 {err:?}"
    );
    assert!(
        start.elapsed() < Duration::from_secs(5),
        "chunk_size = 0 应在入口被拒绝，不应进入构建流程"
    );
}

#[test]
fn negative_chunk_size_returns_invalid_config_error() {
    let err = run(InputTemplate {
        input: VALID_FONT.to_vec(),
        chunk_size: Some(-1),
        ..Default::default()
    })
    .expect_err("负数 chunk_size 必须返回 Err");
    assert!(
        matches!(err, FontSplitError::InvalidConfig(_)),
        "期望 InvalidConfig，实际为 {err:?}"
    );
}

#[test]
fn zero_max_allow_subsets_count_returns_invalid_config_error() {
    let err = run(InputTemplate {
        input: VALID_FONT.to_vec(),
        max_allow_subsets_count: Some(0),
        ..Default::default()
    })
    .expect_err("max_allow_subsets_count = 0 必须返回 Err");
    assert!(
        matches!(err, FontSplitError::InvalidConfig(_)),
        "期望 InvalidConfig，实际为 {err:?}"
    );
}

#[test]
fn error_event_is_emitted_before_returning_err() {
    let events = std::cell::RefCell::new(Vec::new());
    let err = font_split(
        InputTemplate { input: vec![], ..Default::default() },
        |msg| events.borrow_mut().push(msg.event),
    )
    .expect_err("空输入必须返回 Err");

    assert!(
        matches!(err, FontSplitError::EmptyInput),
        "期望 EmptyInput，实际为 {err:?}"
    );
    assert_eq!(
        events.borrow().last().copied(),
        Some(cn_font_proto::api_interface::EventName::Error as i32),
        "返回 Err 之前必须发出 Error 事件，实际事件: {:?}",
        events.borrow()
    );
}

#[test]
fn valid_font_succeeds() {
    let subsets = Cell::new(0);
    let ended = Cell::new(false);
    font_split(
        InputTemplate {
            input: VALID_FONT.to_vec(),
            chunk_size: Some(70 * 1024),
            test_html: Some(false),
            reporter: Some(false),
            ..Default::default()
        },
        |msg| match cn_font_proto::api_interface::EventName::try_from(msg.event)
        {
            Ok(cn_font_proto::api_interface::EventName::OutputData) => {
                if msg.message.ends_with(".woff2") {
                    subsets.set(subsets.get() + 1);
                }
            }
            Ok(cn_font_proto::api_interface::EventName::End) => ended.set(true),
            _ => {}
        },
    )
    .expect("合法字体必须成功");
    assert!(subsets.get() > 0, "应产出至少一个 woff2 分包");
    assert!(ended.get(), "应收到 End 事件");
}
