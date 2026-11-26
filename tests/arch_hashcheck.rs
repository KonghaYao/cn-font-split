//! 架构重构的产物等价性哈希 harness。
//!
//! 固定 `InputTemplate`（字体特性、语言区域、用户分包、单线程）后对仓库自带的
//! 三份字体运行 `font_split`，输出字典序排序的 `文件名 + 字节数 + blake3`，以及
//! 每个字体的分包数、总字节、CSS/HTML/proto 字节数。
//!
//! 该测试默认 `#[ignore]`，不进入常规 `cargo test`；重构前后各跑一次并逐行
//! 比对即可证明「输出字节完全一致」：
//!
//! ```sh
//! cargo test --release --test arch_hashcheck -- --ignored --nocapture --test-threads=1
//! ```
//!
//! 说明：
//! - **必须带 `--test-threads=1`**：多线程下多个测试的输出会交错，无法逐行
//!   比对。单线程下顺序也是确定的：libtest 按测试名排序，因此
//!   `arch_hash_snapshot` 的 3 段在前，`arch_hash_variants` 的各段随后。
//! - 规范化输出时要剥掉 libtest 的测试标题前缀：libtest 会把每个测试的第一段
//!   标题打印在 `test <name> ... ` **同一行**（例如
//!   `test arch_hash_snapshot ... == packages/... ==`），需要先去掉
//!   `^test [A-Za-z0-9_]+ \.\.\. ` 再筛选段标题/汇总行/明细行。
//! - 仓库未引入 `sha2`（不新增依赖），这里用已有的 `blake3` 计算文件摘要，
//!   等价性证明的强度与 sha256 相同（均为密码学摘要）。
//! - `reporter.bin` 里的 `duration` 是实际耗时，天然不可复现。harness 会把
//!   该字段清零后重新编码再摘要，其余字段（版本、name 表、分包明细、bundle、
//!   css 报告）全部参与比对。
//! - CSS 头部注释含 `Utc::now()`，因此固定 `comment_base=false`、
//!   `comment_name_table=false`，否则整行不可复现。

use cn_font_proto::api_interface::input_template::CssProperties;
use cn_font_proto::api_interface::{
    EventMessage, EventName, InputTemplate, OutputReport,
};
use cn_font_split::font_split;
use prost::Message;
use std::fs;

/// 仓库自带字体夹具。
const FONTS: &[&str] = &[
    "packages/demo/public/NotoSerifSC-Regular.ttf",
    "packages/demo/public/WorkSans-VariableFont_wght.ttf",
    "packages/demo/public/SmileySans-Oblique.ttf",
];

/// 用户分包：每字符 4 字节小端编码，与 `Config` 的约定一致。
const USER_SUBSETS: &[&[u32]] = &[&[0x41, 0x42], &[0x4E2D, 0x56FD]];

fn encode_subsets() -> Vec<Vec<u8>> {
    USER_SUBSETS
        .iter()
        .map(|chars| {
            chars.iter().flat_map(|c| c.to_le_bytes()).collect::<Vec<u8>>()
        })
        .collect()
}

/// 大用户分包：2000 个连续 CJK 码点，编码约定同 [`encode_subsets`]。
///
/// 2 字符的用户分包太小，`AutoSubset` 的系数差异（0.5 / 0.7 / 1.0）不会改变
/// 分包数，测不出「按位置查表」的行为；2000 字符才足以暴露。
const BIG_USER_SUBSET: std::ops::Range<u32> = 0x4E00..0x55D0;

fn encode_big_user_subset() -> Vec<u8> {
    BIG_USER_SUBSET.flat_map(|c| c.to_le_bytes()).collect()
}

fn fixed_template(font: &[u8]) -> InputTemplate {
    InputTemplate {
        input: font.to_vec(),
        // 固定目标体积、固定单线程、固定特性开关。
        chunk_size: Some(70 * 1024),
        multi_threads: Some(false),
        font_feature: Some(true),
        language_areas: Some(true),
        reduce_mins: Some(false),
        auto_subset: Some(true),
        subset_remain_chars: Some(true),
        test_html: Some(true),
        reporter: Some(true),
        preview_image: None,
        subsets: encode_subsets(),
        // 关掉含时间戳/name 表的注释，保证 CSS 可复现。
        css: Some(CssProperties {
            comment_base: Some(false),
            comment_name_table: Some(false),
            ..Default::default()
        }),
        ..Default::default()
    }
}

/// 把 reporter.bin 的 `duration` 清零后重新编码，其余字段保持不变。
fn normalize_reporter(bytes: &[u8]) -> Vec<u8> {
    let mut report =
        OutputReport::decode(bytes).expect("reporter.bin 必须可解码");
    for detail in report.subset_detail.iter_mut() {
        detail.duration = 0;
    }
    report.encode_to_vec()
}

fn report(font_path: &str, template: InputTemplate) {
    let collected = std::cell::RefCell::new(Vec::new());
    font_split(template, |msg: EventMessage| {
        if msg.event != EventName::OutputData as i32 {
            return;
        }
        let Some(data) = msg.data else { return };
        collected.borrow_mut().push((msg.message, data));
    })
    .unwrap_or_else(|err| panic!("{font_path} 构建失败: {err}"));
    let mut outputs = collected.into_inner();

    for (name, data) in outputs.iter_mut() {
        if name == "reporter.bin" {
            *data = normalize_reporter(data);
        }
    }
    outputs.sort_by(|a, b| a.0.cmp(&b.0));

    let face_count =
        outputs.iter().filter(|(name, _)| name.ends_with(".woff2")).count();
    let sum = |pred: &dyn Fn(&str) -> bool| -> usize {
        outputs
            .iter()
            .filter(|(name, _)| pred(name))
            .map(|(_, data)| data.len())
            .sum()
    };
    let woff2_bytes = sum(&|name| name.ends_with(".woff2"));
    let css_bytes = sum(&|name| name.ends_with(".css"));
    let html_bytes = sum(&|name| name.ends_with(".html"));
    let proto_bytes = sum(&|name| name.ends_with(".proto"));
    let svg_bytes = sum(&|name| name.ends_with(".svg"));
    let reporter_bytes = sum(&|name| name == "reporter.bin");
    let total_bytes = sum(&|_| true);

    println!("== {font_path} ==");
    println!("face_count {face_count}");
    println!("woff2_bytes {woff2_bytes}");
    println!("css_bytes {css_bytes}");
    println!("html_bytes {html_bytes}");
    println!("proto_bytes {proto_bytes}");
    println!("svg_bytes {svg_bytes}");
    println!("reporter_bytes {reporter_bytes}");
    println!("total_bytes {total_bytes}");
    for (name, data) in &outputs {
        let hash = blake3::hash(data).to_hex();
        println!("{name} {} {hash}", data.len());
    }
    println!();
}

#[test]
#[ignore = "等价性哈希基线，手动运行：cargo test --release --test arch_hashcheck -- --ignored --nocapture --test-threads=1"]
fn arch_hash_snapshot() {
    for font_path in FONTS {
        let binary = fs::read(font_path).expect("读取字体夹具失败");
        report(font_path, fixed_template(&binary));
    }
}

/// 覆盖基线之外的分支：name_template 重命名、preview SVG、reduce_min、
/// 多线程路径、另一个 chunk_size，以及「语言标签按位置查表」的两条盲区：
///
/// - `no_user`：没有用户分包，余数包的下标前移，可能命中某个非空区域标签；
/// - `big_user`：2000 字符的用户分包自身可能命中区域标签，且把后续所有位置
///   整体后移。
///
/// 两条路径都必须与重构前的字节完全一致。
#[test]
#[ignore = "等价性哈希基线，手动运行：cargo test --release --test arch_hashcheck -- --ignored --nocapture --test-threads=1"]
fn arch_hash_variants() {
    for font_path in FONTS {
        let binary = fs::read(font_path).expect("读取字体夹具失败");

        let mut rename = fixed_template(&binary);
        rename.rename_output_font =
            Some("[hash:8]-[index]-[ext].font".to_string());
        rename.preview_image =
            Some(cn_font_proto::api_interface::input_template::PreviewImage {
                text: "永 Hello 123".to_string(),
                name: "preview".to_string(),
            });
        rename.multi_threads = Some(true);
        report(&format!("rename {font_path}"), rename);

        let mut chunk = fixed_template(&binary);
        chunk.chunk_size = Some(48 * 1024);
        report(&format!("chunk48k {font_path}"), chunk);

        let mut reduce = fixed_template(&binary);
        reduce.reduce_mins = Some(true);
        reduce.test_html = Some(false);
        reduce.reporter = Some(false);
        report(&format!("reduce_min {font_path}"), reduce);

        let mut no_user = fixed_template(&binary);
        no_user.subsets = vec![];
        report(&format!("no_user {font_path}"), no_user);

        // 字体没有这些码点时该分包为空、最终被丢弃，但它的位置仍然参与查表，
        // 因此对三款字体都是有效用例。
        let mut big_user = fixed_template(&binary);
        big_user.subsets = vec![encode_big_user_subset()];
        report(&format!("big_user {font_path}"), big_user);
    }
}
