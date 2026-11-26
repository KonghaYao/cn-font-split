//! CJK 与字体特性路径的端到端测试。
//!
//! 现有 `tests/multi_threads_consistency.rs` 只覆盖 WorkSans 且显式关闭
//! `font_feature`，因此 GSUB/GPOS 特性路径没有「并行 = 顺序」的确定性覆盖，
//! 也没有真实中文字体的完整性测试。本文件补上两块：
//!
//! - NotoSerifSC：约 300 个实际存在于 cmap 的字符在 `font_feature = true`
//!   下的分包覆盖、组合标记兜底与连续两次运行的确定性；
//! - WorkSans：`font_feature = true` 时顺序构建与并行构建的产物逐字节一致。
//!
//! 字符集有界：显式传入用户分包并关闭 `subset_remain_chars`，再关闭
//! `language_areas`，避免默认的全字体切分（NotoSerifSC 约 200 个 face）。
//!
//! 运行：
//! ```sh
//! cargo test --locked --test cjk_pipeline -- --nocapture
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
const NOTO_SERIF_SC: &str = "NotoSerifSC-Regular.ttf";
const WORK_SANS: &str = "WorkSans-VariableFont_wght.ttf";
const SMILEY_SANS: &str = "SmileySans-Oblique.ttf";

/// 约 300 个请求字符的构成：250 个常用汉字 + 30 个拉丁字母 + 10 个数字
/// + 10 个标点。候选先经过 cmap 过滤，因此缺失字符不会进入请求集合。
const CJK_QUOTA: usize = 250;
const LATIN_QUOTA: usize = 30;
const DIGITS_QUOTA: usize = 10;
const PUNCT_QUOTA: usize = 10;

/// 《千字文》前段，均为常用汉字；用 `concat!` 避免换行符进入字符集。
const CJK_CANDIDATES: &str = concat!(
    "天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏",
    "闰余成岁律吕调阳云腾致雨露结为霜金生丽水玉出昆冈",
    "剑号巨阙珠称夜光果珍李柰菜重芥姜海咸河淡鳞潜羽翔",
    "龙师火帝鸟官人皇始制文字乃服衣裳推位让国有虞陶唐",
    "吊民伐罪周发殷汤坐朝问道垂拱平章爱育黎首臣伏戎羌",
    "遐迩一体率宾归王鸣凤在竹白驹食场化被草木赖及万方",
    "盖此身发四大五常恭惟鞠养岂敢毁伤女慕贞洁男效才良",
    "知过必改得能莫忘罔谈彼短靡恃己长信使可覆器欲难量",
    "墨悲丝染诗赞羔羊景行维贤克念作圣德建名立形端表正",
    "空谷传声虚堂习听祸因恶积福缘善庆尺璧非宝寸阴是竞",
    "资父事君曰严与敬孝当竭力忠则尽命临深履薄夙兴温凊",
    "似兰斯馨如松之盛川流不息渊澄取映容止若思言辞安定",
    "笃初诚美慎终宜令荣业所基籍甚无竟学优登仕摄职从政",
    "存以甘棠去而益咏乐殊贵贱礼别尊卑上和下睦夫唱妇随",
);
const LATIN_CANDIDATES: &str =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const DIGITS_CANDIDATES: &str = "0123456789";
const PUNCT_CANDIDATES: &str =
    "，。、；：？！“”‘’（）【】《》〈〉—…·「」『』～";

/// `#224` 明确点名的两个组合标记；NotoSerifSC 的 cmap 同时包含两者。
const CANONICAL_COMBINING_MARKS: [u32; 2] = [0x20DD, 0x0301];

/// 读取字体夹具；缺失时给出路径与运行位置提示。
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

/// 用与生产相同的 harfbuzz face 读取 cmap，避免测试另写一套 cmap 解析。
fn cmap_of(font: &[u8]) -> Vec<u32> {
    let face = Face::from_bytes(font, 0);
    let mut chars = face.collect_unicodes();
    chars.sort_unstable();
    chars.dedup();
    chars
}

/// 从候选串里按顺序挑选 `limit` 个 cmap 中真实存在的字符。
fn pick(cmap: &[u32], source: &str, limit: usize) -> Vec<u32> {
    let mut picked = Vec::new();
    for ch in source.chars() {
        let code = ch as u32;
        if picked.contains(&code) || cmap.binary_search(&code).is_err() {
            continue;
        }
        picked.push(code);
        if picked.len() == limit {
            break;
        }
    }
    picked
}

/// 构造约 300 个字符的 CJK 请求集合，并打印各类别数量。
fn requested_chars(cmap: &[u32]) -> Vec<u32> {
    let cjk = pick(cmap, CJK_CANDIDATES, CJK_QUOTA);
    let latin = pick(cmap, LATIN_CANDIDATES, LATIN_QUOTA);
    let digits = pick(cmap, DIGITS_CANDIDATES, DIGITS_QUOTA);
    let punctuation = pick(cmap, PUNCT_CANDIDATES, PUNCT_QUOTA);

    let mut chars = cjk.clone();
    chars.extend(&latin);
    chars.extend(&digits);
    chars.extend(&punctuation);
    chars.sort_unstable();
    chars.dedup();

    assert!(
        cjk.len() >= 240,
        "cmap 应覆盖至少 240 个候选汉字，实际 {}",
        cjk.len()
    );
    assert!(
        latin.len() >= 20,
        "cmap 应覆盖至少 20 个拉丁字母，实际 {}",
        latin.len()
    );
    assert_eq!(digits.len(), DIGITS_QUOTA, "cmap 应覆盖全部数字");
    assert!(
        punctuation.len() >= 5,
        "cmap 应覆盖至少 5 个候选标点，实际 {}",
        punctuation.len()
    );
    assert!(
        (280..=300).contains(&chars.len()),
        "请求字符数应在 280..=300，实际 {}",
        chars.len()
    );

    println!(
        "请求字符 {} 个（汉字 {} / 拉丁 {} / 数字 {} / 标点 {}），字体 cmap {} 个",
        chars.len(),
        cjk.len(),
        latin.len(),
        digits.len(),
        punctuation.len(),
        cmap.len()
    );
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

/// 有界字符集 + 特性开启的 Noto/Smiley 模板。
///
/// `multi_threads` 是 wire IR 里唯一的并行开关：`false` 走顺序 `for` 构建，
/// `true` 走 rayon 并行构建；线程数由 rayon 运行时决定。
fn cjk_template(
    font: &[u8],
    chars: &[u32],
    multi_threads: bool,
) -> InputTemplate {
    InputTemplate {
        input: font.to_vec(),
        // 只请求给定字符，不追加字体里剩余的其它字符。
        subsets: vec![encode_chars(chars)],
        // 与默认值相同，固定下来让「黄金形状」有明确前提。
        chunk_size: Some(70 * 1024),
        // 关掉语言区域预分包，否则全字体字符会先被拆成大量区域分包。
        language_areas: Some(false),
        subset_remain_chars: Some(false),
        auto_subset: Some(true),
        multi_threads: Some(multi_threads),
        // 明确打开 GSUB/GPOS 特性路径。
        font_feature: Some(true),
        test_html: Some(false),
        reporter: Some(true),
        css: reproducible_css(),
        ..Default::default()
    }
}

/// WorkSans 特性路径模板：通过「剩余字符」入口纳入全字体字符（754 个），
/// 让 `FontFeatures` 在多个分包之间搬移关系字符。
fn work_sans_template(font: &[u8], multi_threads: bool) -> InputTemplate {
    InputTemplate {
        input: font.to_vec(),
        chunk_size: Some(70 * 1024),
        language_areas: Some(false),
        subset_remain_chars: Some(true),
        auto_subset: Some(true),
        multi_threads: Some(multi_threads),
        font_feature: Some(true),
        test_html: Some(false),
        reporter: Some(true),
        css: reproducible_css(),
        ..Default::default()
    }
}

/// 一次构建的产物：所有 `OutputData` 文件，以及解码并清零 `duration`
/// 后的 `reporter.bin`。
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
            let mut report = OutputReport::decode(bytes.as_slice())
                .expect("reporter.bin 必须可解码");
            // 耗时与实际调度相关，逐字段清零后其余内容必须可复现。
            for detail in &mut report.subset_detail {
                detail.duration = 0;
            }
            Some(report)
        }
        None => None,
    };

    Run { files, report }
}

/// 组合标记区段，与 `src/pre_subset/features.rs` 的 `#224` 兜底定义一致。
fn is_combining_mark(c: u32) -> bool {
    matches!(
        c,
        0x0300..=0x036F
            | 0x0483..=0x0489
            | 0x1AB0..=0x1AFF
            | 0x1DC0..=0x1DFF
            | 0x20D0..=0x20FF
            | 0xFE20..=0xFE2F
    )
}

fn format_codepoints(codepoints: &[u32]) -> String {
    codepoints
        .iter()
        .map(|c| format!("U+{c:04X}"))
        .collect::<Vec<_>>()
        .join(" ")
}

/// 排除 `reporter.bin`（含不可复现的 duration）后的输出快照。
fn outputs_without_reporter(run: &Run) -> Vec<(&str, &[u8])> {
    run.files
        .iter()
        .filter(|(name, _)| name != "reporter.bin")
        .map(|(name, data)| (name.as_str(), data.as_slice()))
        .collect()
}

/// 断言两次构建的非 reporter 产物逐字节一致，且清零 duration 后的
/// reporter 也完全相同。
fn assert_identical_outputs(left: &Run, right: &Run, context: &str) {
    let left_files = outputs_without_reporter(left);
    let right_files = outputs_without_reporter(right);
    assert_eq!(
        left_files.len(),
        right_files.len(),
        "{context}: 两次构建的输出文件数量不同"
    );
    for (index, (left_file, right_file)) in
        left_files.iter().zip(right_files.iter()).enumerate()
    {
        let (left_name, left_bytes) = *left_file;
        let (right_name, right_bytes) = *right_file;
        assert_eq!(
            left_name, right_name,
            "{context}: 第 {index} 个输出文件名不同"
        );
        assert_eq!(
            left_bytes.len(),
            right_bytes.len(),
            "{context}: {left_name} 的字节数不同"
        );
        assert_eq!(
            left_bytes, right_bytes,
            "{context}: {left_name} 的字节内容不同"
        );
    }
    assert_eq!(
        left.report, right.report,
        "{context}: reporter（duration 已清零）必须完全相同"
    );
}

/// NotoSerifSC：约 300 个字符的分包并集必须覆盖请求，组合标记必须进入
/// 每个非空分包，分包数只做轻量「黄金形状」断言。
#[test]
fn noto_cjk_pipeline_covers_requested_chars() {
    let font = fixture(NOTO_SERIF_SC);
    let cmap = cmap_of(&font);
    let requested = requested_chars(&cmap);

    let run = run(cjk_template(&font, &requested, true));
    let report = run.report();
    let faces = run.faces();

    assert!(!faces.is_empty(), "NotoSerifSC 必须至少产出一个分包");
    assert_eq!(
        faces.len(),
        report.subset_detail.len(),
        "每个 woff2 分包必须对应一条 reporter 明细"
    );

    // 每个分包非空，且文件名唯一。
    let mut names = BTreeSet::new();
    for (name, data) in &faces {
        assert!(!data.is_empty(), "分包 {name} 的输出为空");
        assert!(names.insert(name.as_str()), "分包文件名重复: {name}");
    }

    // reporter 明细与输出文件一一绑定：文件名、字节数、blake3 都相同，
    // 因此下面用 `detail.chars` 判断覆盖是可信的。
    for ((name, data), detail) in faces.iter().zip(&report.subset_detail) {
        assert_eq!(name, &detail.file_name, "分包顺序与 reporter 明细不一致");
        assert_eq!(data.len(), detail.bytes as usize, "{name} 的字节数不一致");
        assert_eq!(
            blake3::hash(data).to_hex().to_string(),
            detail.hash,
            "{name} 的 blake3 与 reporter 不一致"
        );
        assert!(!detail.chars.is_empty(), "分包 {name} 的字符表为空");
    }

    // 输出分包并集覆盖所有请求字符。
    let covered: BTreeSet<u32> = report
        .subset_detail
        .iter()
        .flat_map(|detail| detail.chars.iter().copied())
        .collect();
    let missing: Vec<u32> =
        requested.iter().copied().filter(|c| !covered.contains(c)).collect();
    assert!(
        missing.is_empty(),
        "输出分包并集缺少 {} 个请求字符: {}",
        missing.len(),
        format_codepoints(&missing)
    );
    let bundle = report
        .bundle_message
        .as_ref()
        .expect("reporter 必须包含 bundle_message");
    assert_eq!(
        bundle.bundled_size as usize,
        covered.len(),
        "bundle_message.bundled_size 与明细并集不一致"
    );

    // #224：字体 cmap 里真实存在的组合标记必须出现在每一个非空分包。
    let marks: Vec<u32> =
        cmap.iter().copied().filter(|c| is_combining_mark(*c)).collect();
    if marks.is_empty() {
        println!("跳过组合标记断言：字体 cmap 不含任何组合标记");
    } else {
        for canonical in CANONICAL_COMBINING_MARKS {
            if !marks.contains(&canonical) {
                println!("跳过 U+{canonical:04X} 断言：字体 cmap 不含该码点");
            }
        }
        for detail in &report.subset_detail {
            for mark in &marks {
                assert!(
                    detail.chars.contains(mark),
                    "分包 {} 缺少组合标记 U+{mark:04X}；#224 要求标记出现在每个非空分包",
                    detail.file_name
                );
            }
        }
        println!(
            "组合标记 {} 已出现在全部 {} 个分包中",
            format_codepoints(&marks),
            faces.len()
        );
    }

    // 黄金形状：只守分包数量的量级，不比较整包哈希。
    //
    // 整包哈希会随上游字体版本、harfbuzz/woff2 编码器版本与宿主平台变化，
    // 无法作为跨机器黄金；这里记录精确值供人工比对，断言只覆盖
    // 「有界输入被切成有限几个包」这一稳定形状。
    let face_count = faces.len();
    println!(
        "NotoSerifSC：请求 {} 字 → {} 个分包，明细字符数 {:?}",
        requested.len(),
        face_count,
        report
            .subset_detail
            .iter()
            .map(|detail| detail.chars.len())
            .collect::<Vec<_>>()
    );
    assert!(
        (2..=12).contains(&face_count),
        "NotoSerifSC 的分包数 {face_count} 超出形状区间 2..=12；\
         若上游字体或切分算法变更，请确认后更新此区间"
    );
}

/// 同一 Noto 输入连续运行两次，非 reporter 输出逐字节相同。
#[test]
fn noto_cjk_pipeline_is_deterministic_across_runs() {
    let font = fixture(NOTO_SERIF_SC);
    let cmap = cmap_of(&font);
    let requested = requested_chars(&cmap);

    let first = run(cjk_template(&font, &requested, true));
    let second = run(cjk_template(&font, &requested, true));

    assert!(
        first.faces().len() > 1,
        "需要多个分包才有比较意义，实际 {} 个",
        first.faces().len()
    );
    assert_identical_outputs(&first, &second, "NotoSerifSC 连续两次运行");
    println!(
        "NotoSerifSC：连续两次运行各 {} 个分包，文件名与字节完全一致",
        first.faces().len()
    );
}

/// WorkSans：`font_feature = true` 时，顺序构建（单线程路径）与并行构建
/// 的产物必须逐字节一致。wire IR 只有 `multi_threads: bool`，没有显式线程数；
/// `false` 对应 1 线程的顺序路径，`true` 对应 rayon 默认工作线程池。
#[test]
fn work_sans_feature_path_parallel_matches_sequential() {
    let font = fixture(WORK_SANS);

    let sequential = run(work_sans_template(&font, false));
    let parallel = run(work_sans_template(&font, true));

    assert!(
        sequential.faces().len() > 1,
        "特性路径需要多个分包才能覆盖并行构建，实际 {} 个",
        sequential.faces().len()
    );
    assert_eq!(
        sequential.faces().len(),
        parallel.faces().len(),
        "并行与顺序构建的分包数必须相同"
    );
    assert_identical_outputs(&sequential, &parallel, "WorkSans 特性路径");
    println!(
        "WorkSans：font_feature=true，顺序与并行各 {} 个分包，产物逐字节一致",
        parallel.faces().len()
    );
}

/// SmileySans：cmap 不含组合标记（#224 兜底在该字体上是空操作），
/// 这里验证跳过分支不会凭空注入标记，同时给出第三份字体的分包摘要。
#[test]
fn smiley_sans_pipeline_has_no_combining_marks_to_inject() {
    let font = fixture(SMILEY_SANS);
    let cmap = cmap_of(&font);
    let requested = requested_chars(&cmap);

    let run = run(cjk_template(&font, &requested, true));
    let report = run.report();
    let faces = run.faces();
    assert!(!faces.is_empty(), "SmileySans 必须至少产出一个分包");

    let covered: BTreeSet<u32> = report
        .subset_detail
        .iter()
        .flat_map(|detail| detail.chars.iter().copied())
        .collect();
    let missing: Vec<u32> =
        requested.iter().copied().filter(|c| !covered.contains(c)).collect();
    assert!(
        missing.is_empty(),
        "SmileySans 分包并集缺少 {} 个请求字符: {}",
        missing.len(),
        format_codepoints(&missing)
    );

    let marks: Vec<u32> =
        cmap.iter().copied().filter(|c| is_combining_mark(*c)).collect();
    assert!(
        marks.is_empty(),
        "SmileySans 夹具当前不含组合标记；若字体更新，应改用通用断言，实际 {}",
        format_codepoints(&marks)
    );
    println!("SmileySans：cmap 不含组合标记，跳过 #224 兜底断言");

    let face_count = faces.len();
    println!(
        "SmileySans：请求 {} 字 → {} 个分包，明细字符数 {:?}",
        requested.len(),
        face_count,
        report
            .subset_detail
            .iter()
            .map(|detail| detail.chars.len())
            .collect::<Vec<_>>()
    );
    assert!(
        (2..=12).contains(&face_count),
        "SmileySans 的分包数 {face_count} 超出形状区间 2..=12"
    );
}
