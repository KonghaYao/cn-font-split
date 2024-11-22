use crate::protos::input_template::CssProperties;
use crate::protos::output_report;
use crate::runner::Context;
use cn_font_utils::vec_u32_to_string;
use unicode_range::UnicodeRange;

pub fn output_css(ctx: &mut Context, css: &CssProperties) -> String {
    let name_table = &ctx.name_table;

    let comment_setting = css.comment.unwrap_or_default();

    // fontData.preferredFamily  不使用这个，因为这个容易引起歧义
    let font_family: String = css.font_family.clone().unwrap_or(
        name_table
            .get_name_first("FontFamilyName")
            .unwrap_or("default_font_family".to_string()),
    );

    // 优先使用preferredSubFamily，如果没有，则使用fontSubFamily或fontSubfamily。
    let preferred_sub_family =
        name_table.get_name_first("FontSubfamilyName").unwrap_or(
            name_table.get_name_first("FullFontName").unwrap_or("".to_string()),
        );
    let font_style =
        css.font_style.clone().unwrap_or(if is_italic(&preferred_sub_family) {
            "italic".to_string()
        } else {
            "normal".to_string()
        });

    let font_weight = css
        .font_weight
        .clone()
        .unwrap_or(get_weight(&preferred_sub_family).to_string());

    // 创建本地字体声明字符串。
    let locals = if css.local_family.len() == 0 {
        vec![font_family.clone()]
    } else {
        css.local_family.clone()
    };
    let locals = locals
        .iter()
        .map(|x| format!("local(\"{x}\")").clone())
        .collect::<Vec<String>>();

    let polyfill_str = css
        .polyfill
        .iter()
        .map(|p| {
            format!(
                "url(\"{}\") {}",
                p.name,
                format!("format(\"{}\")", p.format)
            )
        })
        .collect::<Vec<String>>()
        .join(",");

    let display = css.font_display.clone().unwrap_or("swap".to_string());
    let codes: Vec<String> = ctx
        .run_subset_result
        .iter()
        .rev()
        .map(|res| {
            let src_str: String = [
                locals.join(","),
                format!(
                    r#"url("./{}") format("woff2")"#,
                    res.hash.clone() + ".woff2"
                ),
            ]
            .join(",")
                + polyfill_str.as_str();
            let unicode_range = &UnicodeRange::stringify(&res.unicodes);
            let face_code = format!(
                r#"@font-face {{
font-family:"{font_family}";
src:{src_str};
font-style: {font_style};
font-display: {display};
font-weight: {font_weight};
unicode-range:{unicode_range};
}}"#
            );
            // css 这个句尾不需要分号😭
            // 根据注释设置生成Unicode范围的注释。
            let comment = if comment_setting.unicodes.unwrap_or(false) {
                vec_u32_to_string(&res.unicodes)
            } else {
                "".to_string()
            };
            // 根据压缩选项返回压缩或未压缩的样式字符串。

            let compressed = if css.compress.unwrap_or(true) {
                face_code.replace("\n", "")
            } else {
                face_code
            };
            comment + &compressed
        })
        .collect();
    ctx.reporter.css = Some(output_report::Css {
        family: font_family.clone(),
        style: font_style.clone(),
        display: display.clone(),
        weight: font_weight.clone(),
    });

    codes.join("\n")
}

/** 判断是否为斜体 */
fn is_italic(str: &str) -> bool {
    str.to_lowercase().contains("italic")
}

const FONT_WEIGHT_NAME: [(&str, u32); 13] = [
    ("extra light", 200),
    ("ultra light", 200),
    ("extra bold", 800),
    ("ultra bold", 800),
    ("semi bold", 600),
    ("demi bold", 600),
    ("light", 300),
    ("normal", 400),
    ("regular", 400),
    ("medium", 500),
    ("bold", 700),
    ("heavy", 900),
    ("black", 900),
];

pub fn get_weight(sub_family: &str) -> u32 {
    let sub_family = sub_family.to_ascii_lowercase();
    for (name, weight) in FONT_WEIGHT_NAME {
        if sub_family.contains(name) {
            return weight;
        }
    }
    600
}
