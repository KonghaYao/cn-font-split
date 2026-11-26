//! `multi_threads` 只影响构建方式，不影响产物。
//!
//! 同一输入分别以并行（默认）与顺序构建各跑一次，比较：
//!
//! - `OutputData` 事件的顺序与每个文件的字节内容；
//! - `reporter.bin` 的内容（排除每个分包不可复现的 `duration` 字段）。
//!
//! 运行：
//! ```sh
//! cargo test --test multi_threads_consistency -- --nocapture
//! ```

use cn_font_proto::api_interface::input_template::CssProperties;
use cn_font_proto::api_interface::{
    EventMessage, EventName, InputTemplate, OutputReport,
};
use cn_font_split::font_split;
use prost::Message;
use std::cell::RefCell;
use std::collections::BTreeSet;

/// 仓库内的可变字体；`font_feature = false` 走确定性产物路径。
const FONT: &[u8] =
    include_bytes!("../packages/demo/public/WorkSans-VariableFont_wght.ttf");

const REPORTER_FILE: &str = "reporter.bin";

/// 一次构建的产物：按 `OutputData` 事件顺序排列的 `(文件名, 字节)`，
/// 以及单独解码后的 `reporter.bin`。
struct Run {
    files: Vec<(String, Vec<u8>)>,
    report: OutputReport,
}

fn run(multi_threads: bool) -> Run {
    let template = InputTemplate {
        input: FONT.to_vec(),
        // `index.html` 内嵌每个分包的耗时，`reporter.bin` 单独解码后比较。
        test_html: Some(false),
        reporter: Some(true),
        multi_threads: Some(multi_threads),
        font_feature: Some(false),
        // header 注释含 `Utc::now()`，关掉以保证内容可复现。
        css: Some(CssProperties {
            comment_base: Some(false),
            ..Default::default()
        }),
        ..Default::default()
    };

    let files: RefCell<Vec<(String, Vec<u8>)>> = RefCell::new(Vec::new());
    font_split(template, |event: EventMessage| {
        if EventName::try_from(event.event) == Ok(EventName::OutputData) {
            let data = event.data.expect("OutputData 必须携带内容");
            files.borrow_mut().push((event.message, data));
        }
    })
    .expect("合法字体必须构建成功");

    let mut files = files.into_inner();
    let reporter_index = files
        .iter()
        .position(|(name, _)| name == REPORTER_FILE)
        .expect("reporter = true 时必须输出 reporter.bin");
    let (_, reporter_bytes) = files.remove(reporter_index);
    let mut report = OutputReport::decode(reporter_bytes.as_slice())
        .expect("reporter 必须可解码");
    // 耗时与线程调度相关，逐字段清零后再比较其余内容。
    for detail in &mut report.subset_detail {
        detail.duration = 0;
    }

    Run { files, report }
}

#[test]
fn multi_threads_true_and_false_produce_identical_output() {
    let parallel = run(true);
    let sequential = run(false);

    assert!(
        parallel.files.len() > 1,
        "用例需要多个分包才有比较意义，实际 {} 个",
        parallel.files.len()
    );

    let parallel_names: BTreeSet<&str> =
        parallel.files.iter().map(|(name, _)| name.as_str()).collect();
    let sequential_names: BTreeSet<&str> =
        sequential.files.iter().map(|(name, _)| name.as_str()).collect();
    assert_eq!(
        parallel_names, sequential_names,
        "并行与顺序构建的输出文件名集合必须相同"
    );
    assert_eq!(
        parallel.files, sequential.files,
        "并行与顺序构建的文件顺序与字节内容必须完全相同"
    );
    assert_eq!(
        parallel.report, sequential.report,
        "reporter 内容（除 duration）必须完全相同"
    );
}
