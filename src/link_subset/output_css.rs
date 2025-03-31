use crate::pre_subset::name_table::NameTableSets;
use crate::run_subset::RunSubsetResult;
use crate::runner::Context;
use cn_font_proto::api_interface::input_template::CssProperties;
use cn_font_proto::api_interface::output_report::{self};
use cn_font_utils::vec_u32_to_string;
use unicode_range::UnicodeRange;

use super::css::font_weight::extract_font_weight;
use super::css::header_comment::create_header_comment;

fn extract_font_family(
    css: &CssProperties,
    name_table: &NameTableSets,
) -> String {
    css.font_family.clone().unwrap_or_else(|| {
        name_table
            .get_name_first("FontFamilyName")
            .unwrap_or("default_font_family".to_string())
    })
}

fn extract_font_style(
    css: &CssProperties,
    name_table: &NameTableSets,
) -> String {
    let preferred_sub_family =
        name_table.get_name_first("FontSubfamilyName").unwrap_or_else(|| {
            name_table.get_name_first("FullFontName").unwrap_or("".to_string())
        });
    css.font_style.clone().unwrap_or_else(|| {
        if is_italic(&preferred_sub_family) {
            "italic".to_string()
        } else {
            "normal".to_string()
        }
    })
}

fn generate_local_sources(
    css: &CssProperties,
    font_family: &str,
) -> Vec<String> {
    let locals = if css.local_family.is_empty() {
        vec![font_family.to_string()]
    } else {
        css.local_family.clone()
    };
    locals.iter().map(|x| format!("local(\"{x}\")")).collect()
}

fn generate_polyfill_string(css: &CssProperties) -> String {
    css.polyfill
        .iter()
        .map(|p| format!(r#"url("{}") format("{}")"#, p.name, p.format))
        .collect::<Vec<String>>()
        .join(",")
}

fn generate_font_face_code(
    res: &RunSubsetResult,
    font_family: &str,
    font_style: &str,
    font_weight: &str,
    display: &str,
    locals: &[String],
    polyfill_str: &str,
    css: &CssProperties,
) -> String {
    let src_str = [
        locals.join(","),
        format!(r#"url("./{}")format("woff2")"#, res.file_name),
    ]
    .join(",")
        + polyfill_str;
    let unicode_range = UnicodeRange::stringify(&res.unicodes);
    let space = if css.compress.unwrap_or(true) { "" } else { "    " };
    let face_code = format!(
        r#"@font-face{{
{space}font-family:"{font_family}";
{space}src:{src_str};
{space}font-style:{font_style};
{space}font-display:{display};
{space}font-weight:{font_weight};
{space}unicode-range:{unicode_range};
}}"#
    );
    let comment = if css.comment_unicodes.unwrap_or(false) {
        format!("/* {} */\n", vec_u32_to_string(&res.unicodes))
    } else {
        "".to_string()
    };
    let compressed = if css.compress.unwrap_or(true) {
        face_code.replace("\n", "")
    } else {
        face_code
    };
    comment + &compressed
}

pub fn output_css(ctx: &mut Context, css: &CssProperties) -> String {
    let name_table = &ctx.name_table;
    let font_family = extract_font_family(css, name_table);
    let font_style = extract_font_style(css, name_table);
    let font_weight = extract_font_weight(css, ctx, name_table);
    let display = css.font_display.clone().unwrap_or("swap".to_string());

    let locals = generate_local_sources(css, &font_family);
    let polyfill_str = generate_polyfill_string(css);

    let codes = ctx
        .run_subset_result
        .iter()
        .rev()
        .map(|res| {
            generate_font_face_code(
                res,
                &font_family,
                &font_style,
                &font_weight,
                &display,
                &locals,
                &polyfill_str,
                css,
            )
        })
        .collect::<Vec<String>>();

    ctx.reporter.css = Some(output_report::Css {
        family: font_family.clone(),
        style: font_style.clone(),
        display: display.clone(),
        weight: font_weight.clone(),
    });

    let header_comment = create_header_comment(ctx, css);
    header_comment + &codes.join("")
}

/** 判断是否为斜体 */
fn is_italic(str: &str) -> bool {
    str.to_lowercase().contains("italic")
}
#[cfg(test)]
mod tests {
    use super::*;
    use crate::{run_subset::RunSubsetResult, runner::create_context};
    use cn_font_proto::api_interface::{
        input_template::{CssProperties, PolyfillType},
        InputTemplate, OutputReport,
    };
    use harfbuzz_rs_now::Face;

    #[test]
    fn test_basic_output_css() {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);

        let mut ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = vec![RunSubsetResult {
            hash: "test_hash".to_string(),
            unicodes: vec![0x4E00, 0x4E01], // 一丁
            file_name: "test_subset.woff2".to_string(),
        }];
        let css = CssProperties {
            comment_unicodes: Some(true),
            comment_base: Some(true),
            comment_name_table: Some(true),
            ..Default::default()
        };
        let output = output_css(&mut ctx, &css);
        assert!(output.contains("@font-face"));
        assert!(output.contains("font-family:\"default_font_family\""));
        assert!(output.contains("font-style:normal"));
        assert!(output.contains("font-weight:400"));
        assert!(output.contains("font-display:swap"));
    }
    #[test]
    fn test_custom_properties() {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);

        let mut ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = vec![RunSubsetResult {
            hash: "test_hash".to_string(),
            unicodes: vec![0x4E00, 0x4E01], // 一丁
            file_name: "test_subset.woff2".to_string(),
        }];
        let css = CssProperties {
            font_family: Some("CustomFont".to_string()),
            font_style: Some("italic".to_string()),
            font_weight: Some("700".to_string()),
            font_display: Some("block".to_string()),
            ..Default::default()
        };
        let output = output_css(&mut ctx, &css);

        assert!(output.contains("font-family:\"CustomFont\""));
        assert!(output.contains("font-style:italic"));
        assert!(output.contains("font-weight:700"));
        assert!(output.contains("font-display:block"));
    }

    #[test]
    fn test_polyfill_generation() {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);

        let mut ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = vec![RunSubsetResult {
            hash: "test_hash".to_string(),
            unicodes: vec![0x4E00, 0x4E01], // 一丁
            file_name: "test_subset.woff2".to_string(),
        }];
        let css = CssProperties {
            polyfill: vec![PolyfillType {
                name: "test.ttf".to_string(),
                format: "truetype".to_string(),
            }],
            ..Default::default()
        };
        let output = output_css(&mut ctx, &css);
        print!("{}", output);
        assert!(output.contains("url(\"test.ttf\") format(\"truetype\")"));
    }

    #[test]
    fn test_compression_modes() {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);

        let mut ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = vec![RunSubsetResult {
            hash: "test_hash".to_string(),
            unicodes: vec![0x4E00], // 一
            file_name: "test_subset.woff2".to_string(),
        }];

        // 测试压缩模式（默认）
        let css = CssProperties { compress: Some(true), ..Default::default() };
        let compressed_output = output_css(&mut ctx, &css);
        // assert!(!compressed_output.contains("\n")); // 不应包含换行符
        assert!(!compressed_output.contains("    ")); // 不应包含缩进空格

        // 测试非压缩模式
        let css = CssProperties { compress: Some(false), ..Default::default() };
        let uncompressed_output = output_css(&mut ctx, &css);
        assert!(uncompressed_output.contains("\n")); // 应包含换行符
        assert!(uncompressed_output.contains("    ")); // 应包含缩进空格
        assert!(uncompressed_output.contains("font-family")); // 验证基本属性存在
    }

    #[test]
    fn test_comment_generation() {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);

        let mut ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = vec![RunSubsetResult {
            hash: "test_hash".to_string(),
            unicodes: vec![0x4E00, 0x4E01], // 一丁
            file_name: "test_subset.woff2".to_string(),
        }];
        let css = CssProperties {
            comment_unicodes: Some(true),
            comment_base: Some(true),
            comment_name_table: Some(true),
            ..Default::default()
        };
        let output = output_css(&mut ctx, &css);
        assert!(output.contains("Generated By cn-font-split"));
        assert!(output.contains("一丁"));
        assert!(output.contains("U+4E00-4E01"));
    }

    #[test]
    fn test_italic_detection() {
        assert!(is_italic("Italic"));
        assert!(is_italic("Bold Italic"));
        assert!(!is_italic("Regular"));
        assert!(!is_italic("Bold"));
    }
}
