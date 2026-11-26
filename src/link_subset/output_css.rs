use crate::config::{CssConfig, DEFAULT_FONT_FAMILY};
use crate::pre_subset::name_table::NameTableSets;
use crate::run_subset::RunSubsetResult;
use crate::runner::Context;
use cn_font_proto::api_interface::output_report::{self};
use cn_font_utils::vec_u32_to_string;

use super::css::ast::{CssNode, FontFace, SrcItem, Stylesheet};
use super::css::font_weight::extract_font_weight;
use super::css::header_comment::create_header_comment;

/// 非压缩模式下 `@font-face` 内部声明的缩进空格数。
const FONT_FACE_INDENT: usize = 4;

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

fn generate_local_sources(css: &CssConfig, font_family: &str) -> Vec<SrcItem> {
    let locals = if css.local_family.is_empty() {
        vec![font_family.to_string()]
    } else {
        css.local_family.clone()
    };
    locals.into_iter().map(SrcItem::Local).collect()
}

fn generate_polyfill_sources(css: &CssConfig) -> Vec<SrcItem> {
    css.polyfill
        .iter()
        .map(|p| SrcItem::Url {
            url: p.name.clone(),
            format: Some(p.format.clone()),
        })
        .collect()
}

fn build_font_face(
    res: &RunSubsetResult,
    font_family: &str,
    font_style: &str,
    font_weight: &str,
    display: &str,
    locals: &[SrcItem],
    polyfills: &[SrcItem],
) -> FontFace {
    let mut src = locals.to_vec();
    src.push(SrcItem::Url {
        url: format!("./{}", res.file_name),
        format: Some("woff2".to_string()),
    });
    src.extend_from_slice(polyfills);
    FontFace {
        family: font_family.to_string(),
        src,
        style: font_style.to_string(),
        display: display.to_string(),
        weight: font_weight.to_string(),
        unicode_range: res.unicodes.clone(),
    }
}

pub fn output_css(ctx: &mut Context, css: &CssConfig) -> String {
    let name_table = &ctx.name_table;
    let font_family = extract_font_family(css, name_table);
    let font_style = extract_font_style(css, name_table);
    let font_weight = extract_font_weight(css, ctx, name_table);
    let display = css.font_display.clone();

    let locals = generate_local_sources(css, &font_family);
    let polyfills = generate_polyfill_sources(css);

    let mut nodes = Vec::with_capacity(ctx.run_subset_result.len());
    for res in ctx.run_subset_result.iter().rev() {
        if css.comment_unicodes {
            nodes.push(CssNode::Comment(vec_u32_to_string(&res.unicodes)));
        }
        nodes.push(CssNode::FontFace(build_font_face(
            res,
            &font_family,
            &font_style,
            &font_weight,
            &display,
            &locals,
            &polyfills,
        )));
    }

    ctx.reporter.css = Some(output_report::Css {
        family: font_family.clone(),
        style: font_style.clone(),
        display: display.clone(),
        weight: font_weight.clone(),
    });

    let stylesheet =
        Stylesheet { header: create_header_comment(ctx, css), nodes };
    stylesheet.render(css.compress, FONT_FACE_INDENT)
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

    /// 只渲染 CSS：上下文固定为空，CSS 配置与分包结果由调用方给出。
    fn render_results(
        css: &CssConfig,
        results: Vec<RunSubsetResult>,
    ) -> String {
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let base = Config::default();
        let mut face = Face::from_bytes(&binary, 0);
        let mut ctx =
            create_context(&base, &binary, &mut face, &mut reporter, &|_| {});

        ctx.run_subset_result = results;
        output_css(&mut ctx, css)
    }

    fn render(css: &CssConfig, unicodes: Vec<u32>) -> String {
        render_results(
            css,
            vec![RunSubsetResult {
                hash: "test_hash".to_string(),
                unicodes,
                file_name: "test_subset.woff2".to_string(),
            }],
        )
    }

    /// 关闭 header（`Utc::now()` 不可复现）后的确定性 golden 配置。
    fn golden_config(compress: bool) -> CssConfig {
        CssConfig {
            font_family: Some("Golden Sans".to_string()),
            font_weight: Some("700".to_string()),
            font_style: Some("italic".to_string()),
            font_display: "swap".to_string(),
            polyfill: vec![PolyfillType {
                name: "fallback.ttf".to_string(),
                format: "truetype".to_string(),
            }],
            comment_base: false,
            comment_name_table: false,
            comment_unicodes: true,
            compress,
            ..Default::default()
        }
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

    /// golden：压缩模式下 `@font-face` 单行、注释与 polyfill 空格按历史产物。
    #[test]
    fn test_golden_compressed() {
        let output = render(&golden_config(true), vec![0x4E00, 0x4E01]);
        let expected = concat!(
            "/* 一丁 */\n",
            "@font-face{",
            "font-family:\"Golden Sans\";",
            "src:local(\"Golden Sans\"),",
            "url(\"./test_subset.woff2\")format(\"woff2\"),",
            "url(\"fallback.ttf\") format(\"truetype\");",
            "font-style:italic;",
            "font-display:swap;",
            "font-weight:700;",
            "unicode-range:U+4E00-4E01;",
            "}",
        );
        assert_eq!(output, expected);
    }

    /// golden：非压缩模式 4 空格缩进、闭合 `}` 顶格。
    #[test]
    fn test_golden_uncompressed() {
        let output = render(&golden_config(false), vec![0x4E00, 0x4E01]);
        let expected = concat!(
            "/* 一丁 */\n",
            "@font-face{\n",
            "    font-family:\"Golden Sans\";\n",
            "    src:local(\"Golden Sans\"),",
            "url(\"./test_subset.woff2\")format(\"woff2\"),",
            "url(\"fallback.ttf\") format(\"truetype\");\n",
            "    font-style:italic;\n",
            "    font-display:swap;\n",
            "    font-weight:700;\n",
            "    unicode-range:U+4E00-4E01;\n",
            "}",
        );
        assert_eq!(output, expected);
    }

    /// golden：分包结果倒序输出，unicode 注释前置到各自规则之前。
    #[test]
    fn test_golden_multiple_subsets_reversed() {
        let css = CssConfig {
            font_family: Some("Golden Sans".to_string()),
            font_weight: Some("700".to_string()),
            font_style: Some("italic".to_string()),
            font_display: "swap".to_string(),
            comment_base: false,
            comment_name_table: false,
            comment_unicodes: true,
            compress: true,
            ..Default::default()
        };
        let results = vec![
            RunSubsetResult {
                hash: "hash_a".to_string(),
                unicodes: vec![0x4E00],
                file_name: "a.woff2".to_string(),
            },
            RunSubsetResult {
                hash: "hash_b".to_string(),
                unicodes: vec![0x4E01],
                file_name: "b.woff2".to_string(),
            },
        ];
        let output = render_results(&css, results);
        let expected = concat!(
            "/* 丁 */\n",
            "@font-face{font-family:\"Golden Sans\";",
            "src:local(\"Golden Sans\"),url(\"./b.woff2\")format(\"woff2\");",
            "font-style:italic;font-display:swap;font-weight:700;",
            "unicode-range:U+4E01;}",
            "/* 一 */\n",
            "@font-face{font-family:\"Golden Sans\";",
            "src:local(\"Golden Sans\"),url(\"./a.woff2\")format(\"woff2\");",
            "font-style:italic;font-display:swap;font-weight:700;",
            "unicode-range:U+4E00;}",
        );
        assert_eq!(output, expected);
    }
}
