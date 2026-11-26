//! `docs/CONFIG.md` 默认值表与 [`Config`] 的一致性测试。
//!
//! 默认值只在 `src/config.rs` 定义一次；任何一项改动都必须同步本测试与
//! `docs/CONFIG.md`，否则这里会失败。

use cn_font_proto::api_interface::InputTemplate;
use cn_font_proto::api_interface::input_template::{
    CssProperties, PreviewImage,
};
use cn_font_split::FontSplitError;
use cn_font_split::config::{BuildMode, Config};

/// 用「只有合法输入」的最小模板构造配置，其余字段全部走默认值。
fn config_from_default_template() -> Config {
    Config::from_template(&InputTemplate {
        input: vec![0x00],
        ..Default::default()
    })
    .expect("最小模板必须能构造 Config")
}

#[test]
fn default_matches_resolved_default_template() {
    // `Default` 与 `from_template` 的默认解析必须逐字段一致，避免两处真相。
    let config = config_from_default_template();
    assert_eq!(config, Config { input: vec![0x00], ..Config::default() });
}

#[test]
fn documented_defaults_match_config() {
    let config = config_from_default_template();

    // ===== 分包与构建产物 =====
    assert_eq!(config.input, vec![0x00]);
    assert!(config.subsets.is_empty());
    assert_eq!(config.chunk_size, 1024 * 70, "chunk_size 默认 70 KiB");
    assert_eq!(config.chunk_size_tolerance, 0.0, "容差默认 0.0");
    assert_eq!(config.max_allow_subsets_count, None);
    assert!(config.test_html, "test_html 默认生成");
    assert!(config.reporter, "reporter 默认生成");
    assert_eq!(config.preview_image, None);
    assert_eq!(config.rename_output_font, None);
    assert_eq!(config.build_mode, BuildMode::Default);

    // ===== 预分包优化项 =====
    assert!(config.language_areas);
    assert!(config.multi_threads);
    assert!(config.font_feature);
    assert!(!config.reduce_mins, "reduce_mins 默认关闭");
    assert!(config.auto_subset);
    assert!(config.subset_remain_chars);

    // ===== CSS =====
    let css = &config.css;
    assert_eq!(css.font_family, None, "缺省时回退 name 表");
    assert_eq!(css.font_weight, None, "缺省时回退 name 表/可变字体");
    assert_eq!(css.font_style, None, "缺省时按子族名判断斜体");
    assert_eq!(css.font_display, "swap");
    assert!(css.local_family.is_empty());
    assert!(css.polyfill.is_empty());
    assert!(css.comment_base);
    assert!(css.comment_name_table);
    assert!(!css.comment_unicodes, "Unicode 注释默认关闭");
    assert!(css.compress, "CSS 默认压缩");
    assert_eq!(css.file_name, "result.css");
}

#[test]
fn explicit_fields_override_defaults_only() {
    let config = Config::from_template(&InputTemplate {
        input: vec![0x00],
        chunk_size: Some(48 * 1024),
        test_html: Some(false),
        auto_subset: Some(false),
        css: Some(CssProperties {
            compress: Some(false),
            font_display: Some("block".to_string()),
            ..Default::default()
        }),
        ..Default::default()
    })
    .expect("显式字段必须能覆盖默认值");

    assert_eq!(config.chunk_size, 48 * 1024);
    assert!(!config.test_html);
    assert!(!config.auto_subset);
    assert!(!config.css.compress);
    assert_eq!(config.css.font_display, "block");

    // 未给出的字段仍保持文档中的默认值。
    assert!(config.reporter);
    assert_eq!(config.css.file_name, "result.css");
    assert_eq!(config.css.font_family, None);
}

#[test]
fn template_roundtrip_is_stable() {
    let template = InputTemplate {
        input: vec![0x00],
        subsets: vec![vec![0x41, 0x00, 0x00, 0x00]],
        css: Some(CssProperties {
            font_family: Some("Demo".to_string()),
            font_weight: Some("700".to_string()),
            font_style: Some("italic".to_string()),
            font_display: Some("block".to_string()),
            local_family: vec!["Demo Local".to_string()],
            comment_base: Some(false),
            comment_name_table: Some(false),
            comment_unicodes: Some(true),
            compress: Some(false),
            file_name: Some("demo.css".to_string()),
            ..Default::default()
        }),
        language_areas: Some(false),
        chunk_size: Some(70 * 1024),
        // 容差语义未实现，当前只接受 0（非 0 会被校验拒绝）。
        chunk_size_tolerance: Some(0.0),
        max_allow_subsets_count: Some(10),
        test_html: Some(false),
        reporter: Some(false),
        preview_image: Some(PreviewImage {
            text: "预览".to_string(),
            name: "preview".to_string(),
        }),
        rename_output_font: Some("[hash].woff2".to_string()),
        build_mode: Some("default".to_string()),
        multi_threads: Some(false),
        font_feature: Some(false),
        reduce_mins: Some(true),
        auto_subset: Some(false),
        subset_remain_chars: Some(false),
        ..Default::default()
    };

    let config = Config::from_template(&template).expect("模板必须合法");
    let rebuilt = Config::from_template(&config.to_template())
        .expect("to_template 的输出必须能再次解析");
    assert_eq!(config, rebuilt, "Config -> InputTemplate -> Config 必须稳定");
}

#[test]
fn validation_variants_are_unchanged() {
    // 校验已迁入 Config::from_template，错误 variant 保持历史行为。
    let err = Config::from_template(&InputTemplate::default())
        .expect_err("空输入必须返回 Err");
    assert!(matches!(err, FontSplitError::EmptyInput));

    let err = Config::from_template(&InputTemplate {
        input: vec![0x00],
        chunk_size: Some(0),
        ..Default::default()
    })
    .expect_err("chunk_size = 0 必须返回 Err");
    assert!(matches!(err, FontSplitError::InvalidConfig(_)));

    let err = Config::from_template(&InputTemplate {
        input: vec![0x00],
        subsets: vec![vec![1, 2, 3]],
        ..Default::default()
    })
    .expect_err("非 4 字节对齐的 subsets 必须返回 Err");
    assert!(matches!(err, FontSplitError::InvalidSubsets(_)));

    // 容差语义未实现：非 0 值必须显式拒绝，0 继续可用。
    let err = Config::from_template(&InputTemplate {
        input: vec![0x00],
        chunk_size_tolerance: Some(0.1),
        ..Default::default()
    })
    .expect_err("非 0 chunk_size_tolerance 必须返回 Err");
    assert!(matches!(err, FontSplitError::InvalidConfig(_)));

    Config::from_template(&InputTemplate {
        input: vec![0x00],
        chunk_size_tolerance: Some(0.0),
        ..Default::default()
    })
    .expect("chunk_size_tolerance = 0 必须可用");

    // build_mode 已收为枚举：只接受 None / 空串 / "default"。
    let err = Config::from_template(&InputTemplate {
        input: vec![0x00],
        build_mode: Some("fast".to_string()),
        ..Default::default()
    })
    .expect_err("未知 build_mode 必须返回 Err");
    assert!(matches!(err, FontSplitError::InvalidConfig(_)));

    for mode in [None, Some(String::new()), Some("default".to_string())] {
        Config::from_template(&InputTemplate {
            input: vec![0x00],
            build_mode: mode.clone(),
            ..Default::default()
        })
        .unwrap_or_else(|err| {
            panic!("build_mode = {mode:?} 必须合法，实际错误: {err:?}")
        });
    }
}
