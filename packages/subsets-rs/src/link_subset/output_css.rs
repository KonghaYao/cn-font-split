use unicode_range::UnicodeRange;
use crate::protos::input_template::CssProperties;
use crate::runner::Context;

pub fn output_css(ctx: &&mut Context, css: &CssProperties) -> String {
    let name_table = &ctx.name_table;

    let comment_setting = css.comment.unwrap_or_default();

    // fontData.preferredFamily  不使用这个，因为这个容易引起歧义
    let font_family: String = css.font_family.clone().unwrap_or(
        name_table
            .get_name_first("FontFamilyName")
            .unwrap_or("default_font_family".to_string()),
    );

    // 优先使用preferredSubFamily，如果没有，则使用fontSubFamily或fontSubfamily。
    let preferred_sub_family = name_table.get_name_first("FontSubfamilyName").unwrap_or(
        name_table
            .get_name_first("FullFontName")
            .unwrap_or("".to_string()),
    );
    let font_style = css
        .font_style.clone()
        .unwrap_or(if is_italic(&preferred_sub_family) {
            "italic".to_string()
        } else {
            "normal".to_string()
        });

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
                format!(r#"url("./{}") format("woff2")"#, res.hash.clone() + ".woff2")
            ]
                .join(",") + polyfill_str.as_str();
            let unicode_range = &UnicodeRange::stringify(&res.unicodes);
            let face_code = format!(
                r#"@font-face {{
font-family:"{font_family}";
src:{src_str};
font-style: {font_style};
font-display: {display};
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
    codes.join("\n")
}

/** 判断是否为斜体 */
fn is_italic(str: &str) -> bool {
    str.to_lowercase().contains("italic")
}

pub fn vec_u32_to_string(vec: &Vec<u32>) -> String {
    let chars: Vec<char> = vec
        .iter()
        .map(|u| std::char::from_u32(u.clone()).unwrap_or(' '))
        .collect();
    chars.into_iter().collect()
}