use crate::config::{CssConfig, DEFAULT_FONT_FAMILY};
use crate::pre_subset::name_table::NameTableSets;
use crate::run_subset::RunSubsetResult;
use crate::runner::Context;
use cn_font_proto::api_interface::output_report::{self};
use cn_font_utils::vec_u32_to_string;
use unicode_range::UnicodeRange;

use super::css::font_weight::extract_font_weight;
use super::css::header_comment::create_header_comment;

fn extract_font_family(css: &CssConfig, name_table: &NameTableSets) -> String {
    css.font_family.clone().unwrap_or_else(|| {
        name_table
            .get_name_first("FontFamilyName")
            .unwrap_or_else(|| DEFAULT_FONT_FAMILY.to_string())
    })
}

fn extract_font_style(css: &CssConfig, name_table: &NameTableSets) -> String {
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

fn generate_local_sources(css: &CssConfig, font_family: &str) -> Vec<String> {
    let locals = if css.local_family.is_empty() {
        vec![font_family.to_string()]
    } else {
        css.local_family.clone()
    };
    locals.iter().map(|x| format!("local(\"{x}\")")).collect()
}

fn generate_polyfill_string(css: &CssConfig) -> String {
    css.polyfill
        .iter()
        .map(|p| format!(r#"url("{}") format("{}")"#, p.name, p.format))
        .collect::<Vec<String>>()
        .join(",")
}

// 该函数是 CSS 模板的唯一拼装入口，参数虽多但都是无状态输入；
// 为保持现有调用形态与产物逐字节不变，不强行合并为结构体。
#[allow(clippy::too_many_arguments)]
fn generate_font_face_code(
    res: &RunSubsetResult,
    font_family: &str,
    font_style: &str,
    font_weight: &str,
    display: &str,
    locals: &[String],
    polyfill_str: &str,
    css: &CssConfig,
) -> String {
    let src_str = [
        locals.join(","),
        format!(r#"url("./{}")format("woff2")"#, res.file_name),
    ]
    .join(",")
        + polyfill_str;
    let unicode_range = UnicodeRange::stringify(&res.unicodes);
    let space = if css.compress { "" } else { "    " };
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
    let comment = if css.comment_unicodes {
        format!("/* {} */\n", vec_u32_to_string(&res.unicodes))
    } else {
        "".to_string()
    };
    let compressed =
        if css.compress { face_code.replace("\n", "") } else { face_code };
    comment + &compressed
}

pub fn output_css(ctx: &mut Context, css: &CssConfig) -> String {
    let name_table = &ctx.name_table;
    let font_family = extract_font_family(css, name_table);
    let font_style = extract_font_style(css, name_table);
    let font_weight = extract_font_weight(css, ctx, name_table);
    let display = css.font_display.clone();

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
    use crate::config::Config;
    use crate::run_subset::RunSubsetResult;
    use crate::runner::create_context;
    use cn_font_proto::api_interface::OutputReport;
    use cn_font_proto::api_interface::input_template::PolyfillType;
    use harfbuzz_rs_now::Face;

    /// 只渲染 CSS：上下文固定为空，CSS 配置由调用方给出。
    fn render(css: &CssConfig, unicodes: Vec<u32>) -> String {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let base = Config::default();
        let mut face = Face::from_bytes(&binary, 0);
        let mut ctx =
            create_context(&base, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = vec![RunSubsetResult {
            hash: "test_hash".to_string(),
            unicodes,
            file_name: "test_subset.woff2".to_string(),
        }];
        output_css(&mut ctx, css)
    }

    #[test]
    fn test_basic_output_css() {
        // 默认值全部来自 CssConfig：字体家族回退到 default_font_family。
        let css = CssConfig { comment_unicodes: true, ..Default::default() };
        let output = render(&css, vec![0x4E00, 0x4E01]); // 一丁
        assert!(output.contains("@font-face"));
        assert!(output.contains("font-family:\"default_font_family\""));
        assert!(output.contains("font-style:normal"));
        assert!(output.contains("font-weight:400"));
        assert!(output.contains("font-display:swap"));
    }

    #[test]
    fn test_custom_properties() {
        let css = CssConfig {
            font_family: Some("CustomFont".to_string()),
            font_style: Some("italic".to_string()),
            font_weight: Some("700".to_string()),
            font_display: "block".to_string(),
            ..Default::default()
        };
        let output = render(&css, vec![0x4E00, 0x4E01]); // 一丁

        assert!(output.contains("font-family:\"CustomFont\""));
        assert!(output.contains("font-style:italic"));
        assert!(output.contains("font-weight:700"));
        assert!(output.contains("font-display:block"));
    }

    #[test]
    fn test_polyfill_generation() {
        let css = CssConfig {
            polyfill: vec![PolyfillType {
                name: "test.ttf".to_string(),
                format: "truetype".to_string(),
            }],
            ..Default::default()
        };
        let output = render(&css, vec![0x4E00, 0x4E01]); // 一丁
        print!("{}", output);
        assert!(output.contains("url(\"test.ttf\") format(\"truetype\")"));
    }

    #[test]
    fn test_compression_modes() {
        // 测试压缩模式（默认）
        let css = CssConfig { compress: true, ..Default::default() };
        let compressed_output = render(&css, vec![0x4E00]); // 一
        // assert!(!compressed_output.contains("\n")); // 不应包含换行符
        assert!(!compressed_output.contains("    ")); // 不应包含缩进空格

        // 测试非压缩模式
        let css = CssConfig { compress: false, ..Default::default() };
        let uncompressed_output = render(&css, vec![0x4E00]); // 一
        assert!(uncompressed_output.contains("\n")); // 应包含换行符
        assert!(uncompressed_output.contains("    ")); // 应包含缩进空格
        assert!(uncompressed_output.contains("font-family")); // 验证基本属性存在
    }

    #[test]
    fn test_comment_generation() {
        let css = CssConfig { comment_unicodes: true, ..Default::default() };
        let output = render(&css, vec![0x4E00, 0x4E01]); // 一丁
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
