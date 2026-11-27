//! #211：用户/扫描分包必须按字体真实字符集过滤。
//!
//! 超轻量模式（`vite-plugin-font`）会把扫描到的中文码点塞进用户分包。若字体
//! 本身没有这些字形（典型是只含 Emoji 的 NotoColorEmoji），修复前它们会原样
//! 进入流水线，产出「字符表非空、字形表为空」的 woff2，浏览器加载时报
//! `OTS parsing error: glyf: zero-length table`。
//!
//! 这里用 WorkSans（`glyf` 轮廓的拉丁字体）模拟同一场景：用户分包里混入
//! 字体 cmap 中根本不存在的汉字与 Emoji。断言：
//!
//! - `subset_detail[].chars` 全部落在字体字符集内；
//! - 过滤后为空的用户分包被整体丢弃；
//! - 留下的 woff2 解压后 `glyf` 表长度非 0，且能被 harfbuzz 重新解析；
//! - 只请求字体已覆盖的字符时，产物与「多传了几个缺失字符」完全相同。
//!
//! 运行：
//! ```sh
//! cargo test --locked --test user_subset_filter -- --nocapture
//! ```

use cn_font_proto::api_interface::input_template::CssProperties;
use cn_font_proto::api_interface::{
    EventMessage, EventName, InputTemplate, OutputReport,
};
use cn_font_split::font_split;
use harfbuzz_rs_now::Face;
use prost::Message;
use std::cell::RefCell;
use std::collections::BTreeSet;
use std::fs;
use std::path::PathBuf;

/// 仓库自带的字体夹具，路径由 `CARGO_MANIFEST_DIR` 拼接，避免依赖 cwd。
const FIXTURE_DIR: &str = "packages/demo/public";
const WORK_SANS: &str = "WorkSans-VariableFont_wght.ttf";
const SMILEY_SANS: &str = "SmileySans-Oblique.ttf";

/// SmileySans 只覆盖部分常用汉字：用它模拟「扫描到一批中文、字体只认其中
/// 一部分」的真实场景（#211 的 NotoColorEmoji 是覆盖率更极端的版本）。
const PARTIAL_RANGE: std::ops::Range<u32> = 0x4E00..0x55D0;

/// 字体里真实存在的两个字母。
const PRESENT_CHARS: [u32; 2] = [0x41, 0x42];
/// 字体里不存在的字符：两个汉字 + 一个 Emoji，对应 #211 的中文扫描字符。
const ABSENT_CHARS: [u32; 3] = [0x4E2D, 0x56FD, 0x1F600];

fn fixture(name: &str) -> Vec<u8> {
    let path =
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(FIXTURE_DIR).join(name);
    fs::read(&path).unwrap_or_else(|error| {
        panic!(
            "无法读取字体夹具 {}: {error}\n\
             请确认在仓库根目录运行测试，且 demo 字体未被裁剪",
            path.display()
        )
    })
}

/// 与生产相同的 harfbuzz face 读取 cmap。
fn cmap_of(font: &[u8]) -> Vec<u32> {
    let face = Face::from_bytes(font, 0);
    let mut chars = face.collect_unicodes();
    chars.sort_unstable();
    chars.dedup();
    chars
}

/// 每个字符 4 字节小端，与 `Config` 的用户分包约定一致。
fn encode_chars(chars: &[u32]) -> Vec<u8> {
    chars.iter().flat_map(|c| c.to_le_bytes()).collect()
}

/// 关闭与时间/name 表相关的 CSS 注释，保证同一输入可逐字节复现。
fn reproducible_css() -> Option<CssProperties> {
    Some(CssProperties {
        comment_base: Some(false),
        comment_name_table: Some(false),
        ..Default::default()
    })
}

/// 只请求给定用户分包的有界模板：关掉语言区域与剩余字符，避免把整个字体
/// 都切成大量分包，让断言聚焦用户分包本身。
fn template(font: &[u8], subsets: &[Vec<u32>]) -> InputTemplate {
    InputTemplate {
        input: font.to_vec(),
        subsets: subsets.iter().map(|chars| encode_chars(chars)).collect(),
        chunk_size: Some(70 * 1024),
        language_areas: Some(false),
        subset_remain_chars: Some(false),
        auto_subset: Some(true),
        multi_threads: Some(false),
        // 特性路径不是本 issue 的修复范围，关掉以隔离变量。
        font_feature: Some(false),
        test_html: Some(false),
        reporter: Some(true),
        css: reproducible_css(),
        ..Default::default()
    }
}

/// 一次构建的产物：所有 `OutputData` 文件，以及解码后的 `reporter.bin`。
struct Run {
    files: Vec<(String, Vec<u8>)>,
    report: Option<OutputReport>,
}

impl Run {
    /// 按输出顺序返回所有 woff2 分包。
    fn faces(&self) -> Vec<&(String, Vec<u8>)> {
        self.files.iter().filter(|(name, _)| name.ends_with(".woff2")).collect()
    }

    fn report(&self) -> &OutputReport {
        self.report.as_ref().expect("reporter = true 时必须输出 reporter.bin")
    }
}

fn run(template: InputTemplate) -> Run {
    let files: RefCell<Vec<(String, Vec<u8>)>> = RefCell::new(Vec::new());
    font_split(template, |event: EventMessage| {
        if EventName::try_from(event.event) != Ok(EventName::OutputData) {
            return;
        }
        let data = event.data.expect("OutputData 事件必须携带内容");
        files.borrow_mut().push((event.message, data));
    })
    .expect("合法字体与配置必须构建成功");

    let mut files = files.into_inner();
    let report = match files.iter().position(|(name, _)| name == "reporter.bin")
    {
        Some(index) => {
            let (_, bytes) = files.remove(index);
            Some(
                OutputReport::decode(bytes.as_slice())
                    .expect("reporter.bin 必须可解码"),
            )
        }
        None => None,
    };

    Run { files, report }
}

/// 返回 ttf 表目录中 `glyf` 表的字节长度；没有该表（CFF 轮廓）返回 `None`。
///
/// 这里直接读表目录而不引入新依赖：`glyf: zero-length table` 正是 OTS 在
/// 表长度为 0 时报出的错误，所以长度就是最贴近浏览器行为的断言目标。
fn glyf_table_len(ttf: &[u8]) -> Option<usize> {
    let num_tables =
        u16::from_be_bytes(ttf.get(4..6)?.try_into().unwrap()) as usize;
    for index in 0..num_tables {
        let record = ttf.get(12 + index * 16..12 + index * 16 + 16)?;
        if &record[0..4] != b"glyf" {
            continue;
        }
        let length = u32::from_be_bytes(record[12..16].try_into().unwrap());
        return Some(length as usize);
    }
    None
}

fn format_codepoints(codepoints: &[u32]) -> String {
    codepoints
        .iter()
        .map(|c| format!("U+{c:04X}"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// 校验一个 woff2 分包：能解压、`glyf` 非零长、能被 harfbuzz 重新解析，
/// 且解析出的字符集非空并落在字体字符集内。返回重新解析出的字符集。
fn assert_loadable_subset(
    name: &str,
    woff2: &[u8],
    cmap: &BTreeSet<u32>,
    detail_chars: &[u32],
) -> Vec<u32> {
    let ttf = woff::version2::decompress(woff2)
        .unwrap_or_else(|| panic!("{name}: woff2 必须能解压回 ttf"));

    let glyf_len = glyf_table_len(&ttf)
        .unwrap_or_else(|| panic!("{name}: 这是 glyf 字体，必须带 glyf 表"));
    assert!(
        glyf_len > 0,
        "{name}: glyf 表长度为 0，浏览器 OTS 会报 `glyf: zero-length table`"
    );

    let face = Face::from_bytes(&ttf, 0);
    let mut parsed = face.collect_unicodes();
    parsed.sort_unstable();
    parsed.dedup();
    // U+0000 是 `.notdef` 的 cmap 占位，不是请求字符：`run_subset` 的
    // 差异检查同样排除它。
    let parsed: Vec<u32> = parsed.into_iter().filter(|c| *c != 0).collect();
    assert!(!parsed.is_empty(), "{name}: 重新解析后字符集为空");

    let outside: Vec<u32> =
        parsed.iter().copied().filter(|c| !cmap.contains(c)).collect();
    assert!(
        outside.is_empty(),
        "{name}: 重新解析出的字符不在字体字符集内: {}",
        format_codepoints(&outside)
    );

    let mut expected = detail_chars.to_vec();
    expected.sort_unstable();
    expected.dedup();
    // subset 后 cmap 可能比明细少：映射到 `.notdef` 的字符会被 harfbuzz
    // 丢掉（SmileySans 的 U+4E00 就是这种）。多出来的字符则一定是过滤失效。
    let extra: Vec<u32> =
        parsed.iter().copied().filter(|c| !expected.contains(c)).collect();
    assert!(
        extra.is_empty(),
        "{name}: 重新解析出 reporter 明细之外的字符: {}",
        format_codepoints(&extra)
    );
    parsed
}

/// 核心回归：缺失码点被过滤，过滤后为空的用户分包被丢弃，剩余分包可正常解析。
#[test]
fn missing_codepoints_are_filtered_out() {
    let font = fixture(WORK_SANS);
    let cmap = cmap_of(&font);
    for code in PRESENT_CHARS {
        assert!(cmap.binary_search(&code).is_ok(), "夹具应包含 U+{code:04X}");
    }
    for code in ABSENT_CHARS {
        assert!(
            cmap.binary_search(&code).is_err(),
            "夹具不应包含 U+{code:04X}"
        );
    }
    let cmap_set: BTreeSet<u32> = cmap.iter().copied().collect();

    // 第一个用户分包：字体内 + 字体外混合；第二个用户分包：全部在字体外。
    let mixed: Vec<u32> =
        PRESENT_CHARS.iter().chain(ABSENT_CHARS.iter()).copied().collect();
    let run = run(template(&font, &[mixed, ABSENT_CHARS.to_vec()]));
    let report = run.report();

    // 全缺失的用户分包在字体里没有任何字形，必须被整体丢弃；混合包过滤后
    // 只剩两个字母，因此只有一个分包。
    assert_eq!(
        report.subset_detail.len(),
        1,
        "过滤后为空的用户分包必须被丢弃，实际明细: {:?}",
        report.subset_detail.iter().map(|d| &d.chars).collect::<Vec<_>>()
    );

    let detail = &report.subset_detail[0];
    let mut sorted = detail.chars.clone();
    sorted.sort_unstable();
    assert_eq!(
        sorted,
        PRESENT_CHARS.to_vec(),
        "混合包只应保留字体字符集内的字母"
    );
    for code in ABSENT_CHARS {
        assert!(
            !detail.chars.contains(&code),
            "U+{code:04X} 不在字体字符集内，不能进入分包字符表"
        );
    }
    let outside: Vec<u32> = report
        .subset_detail
        .iter()
        .flat_map(|d| d.chars.iter().copied())
        .filter(|c| !cmap_set.contains(c))
        .collect();
    assert!(
        outside.is_empty(),
        "subset_detail 出现字体字符集外的码点: {}",
        format_codepoints(&outside)
    );

    let bundle = report
        .bundle_message
        .as_ref()
        .expect("reporter 必须包含 bundle_message");
    assert_eq!(
        bundle.bundled_size as usize,
        PRESENT_CHARS.len(),
        "bundle 的字符数只应统计字体字符集内的码点"
    );

    let faces = run.faces();
    assert_eq!(faces.len(), 1, "分包数与明细数必须一致");
    for ((name, data), detail) in faces.iter().zip(&report.subset_detail) {
        assert_eq!(name, &detail.file_name);
        let parsed =
            assert_loadable_subset(name, data, &cmap_set, &detail.chars);
        // 两个字母在 WorkSans 里都有真实字形，重新解析必须一个不少。
        assert_eq!(parsed, PRESENT_CHARS.to_vec(), "{name}: 字母字形丢失");
    }
}

/// 常规路径：字体覆盖全部请求字符时，产物与「多传若干缺失字符」完全一致。
///
/// 这是对「过滤不改动不变情形」的局部证明：两条输入的唯一差异是缺失码点，
/// 过滤把它们全部摘掉后，剩下的每个分包字符表、字节与文件名都必须相同。
#[test]
fn present_only_request_is_unaffected_by_filtering() {
    let font = fixture(WORK_SANS);
    let plain = run(template(&font, &[PRESENT_CHARS.to_vec()]));
    let with_absent = run(template(
        &font,
        &[{
            let mut chars = PRESENT_CHARS.to_vec();
            chars.extend(ABSENT_CHARS);
            chars
        }],
    ));

    let plain_faces = plain.faces();
    let filtered_faces = with_absent.faces();
    assert_eq!(plain_faces.len(), 1);
    assert_eq!(filtered_faces.len(), plain_faces.len());
    assert_eq!(
        plain_faces[0], filtered_faces[0],
        "缺失码点过滤后，分包的文件名与字节必须与只请求有效字符时相同"
    );

    let plain_detail = &plain.report().subset_detail[0];
    let filtered_detail = &with_absent.report().subset_detail[0];
    assert_eq!(plain_detail.chars, filtered_detail.chars);
    assert_eq!(plain_detail.hash, filtered_detail.hash);
}

/// 真实字体的部分缺失：请求一批中文，字体只认其中一部分。
///
/// 过滤必须等价于「一开始就只请求交集」——产物逐字节相同，说明过滤没有
/// 丢掉字体里真实存在的字，也没有改动剩余字符的分配。
#[test]
fn partial_missing_request_matches_intersection() {
    let font = fixture(SMILEY_SANS);
    let cmap = cmap_of(&font);
    let cmap_set: BTreeSet<u32> = cmap.iter().copied().collect();
    let requested: Vec<u32> = PARTIAL_RANGE.collect();
    let present: Vec<u32> =
        requested.iter().copied().filter(|c| cmap_set.contains(c)).collect();
    assert!(!present.is_empty(), "夹具应覆盖请求区段的一部分");
    assert!(
        present.len() < requested.len(),
        "请求区段应包含字体缺失的字，否则测不到过滤"
    );

    let with_missing = run(template(&font, &[requested]));
    let present_only = run(template(&font, &[present.clone()]));

    // 过滤后的构建与「直接请求交集」必须逐字节一致：文件名、字节、顺序。
    let filtered_faces = with_missing.faces();
    let reference_faces = present_only.faces();
    assert!(!filtered_faces.is_empty(), "交集非空时必须产出分包");
    assert_eq!(
        filtered_faces, reference_faces,
        "过滤后的产物必须与直接请求字体字符集交集时完全相同"
    );

    // 明细并集恰好等于交集，且每个分包都能正常解析。
    let mut covered: Vec<u32> = with_missing
        .report()
        .subset_detail
        .iter()
        .flat_map(|detail| detail.chars.iter().copied())
        .collect();
    covered.sort_unstable();
    covered.dedup();
    assert_eq!(covered, present, "分包并集必须恰好是请求与字体字符集的交集");

    for ((name, data), detail) in
        filtered_faces.iter().zip(&with_missing.report().subset_detail)
    {
        assert_loadable_subset(name, data, &cmap_set, &detail.chars);
    }
}

/// 全部用户分包都被过滤掉时：不产出任何 woff2，也不 panic。
#[test]
fn all_missing_request_produces_no_subset() {
    let font = fixture(WORK_SANS);
    let run = run(template(&font, &[ABSENT_CHARS.to_vec()]));
    let report = run.report();

    assert!(
        report.subset_detail.is_empty(),
        "字体里没有任何请求字符时不应产出分包"
    );
    assert!(run.faces().is_empty(), "不应输出 woff2");
    let bundle = report
        .bundle_message
        .as_ref()
        .expect("reporter 必须包含 bundle_message");
    assert_eq!(bundle.bundled_size, 0);
}
