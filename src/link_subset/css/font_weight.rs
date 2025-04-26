//! 字体权重相关的工具函数

use crate::{pre_subset::name_table::NameTableSets, runner::Context};
use cn_font_proto::api_interface::input_template::CssProperties;

/// 字体权重名称到数值的映射表
/// 按照字符串长度降序排序，以确保最长匹配优先
const FONT_WEIGHT_NAME: [(&str, u32); 21] = [
    // 带空格版本
    ("extra light", 200),
    ("extralight", 200),
    ("ultralight", 200),
    ("ultra light", 200),
    ("extrabold", 800),
    ("extra bold", 800),
    ("ultrabold", 800),
    ("ultra bold", 800),
    ("semibold", 600),
    ("semi bold", 600),
    ("demibold", 600),
    ("demi bold", 600),
    ("hairline", 100),
    ("regular", 400),
    ("medium", 500),
    ("normal", 400),
    ("light", 300),
    ("black", 900),
    ("heavy", 900),
    ("bold", 700),
    ("thin", 100),
];

/// 从字体子族名称中提取字体权重值
///
/// # 参数
/// * `sub_family` - 字体子族名称
///
/// # 返回值
/// * 对应的字体权重值（100-900），如果未找到匹配则返回默认值 400
///
/// # 示例
/// ```
/// assert_eq!(get_weight("bold"), 700);
/// assert_eq!(get_weight("extra light"), 200);
/// assert_eq!(get_weight("unknown"), 400); // 默认值
/// ```
pub fn get_weight(sub_family: &str) -> u32 {
    let sub_family = sub_family.to_ascii_lowercase();

    // 遍历数组找到最长匹配的权重
    let mut max_len = 0;
    let mut weight = 400; // 默认权重

    for &(name, value) in FONT_WEIGHT_NAME.iter() {
        if sub_family.contains(name) && name.len() > max_len {
            max_len = name.len();
            weight = value;
        }
    }

    weight
}

/// 从 CSS 属性和字体元数据中提取字体权重
///
/// 提取优先顺序：
/// 1. CSS 属性中直接指定的权重
/// 2. 变量字体的权重范围
/// 3. 从字体名称中提取的权重
///
/// # 参数
/// * `css` - CSS 属性配置
/// * `ctx` - 运行上下文
/// * `name_table` - 字体名称表
///
/// # 返回值
/// * 字体权重字符串，可能是单个值或范围
pub fn extract_font_weight(
    css: &CssProperties,
    ctx: &Context,
    name_table: &NameTableSets,
) -> String {
    css.font_weight.clone().unwrap_or_else(|| {
        // 按优先级从字体名称表中获取子族名称
        let preferred_sub_family = name_table
            .get_name_first("TypographicSubfamilyName")
            .unwrap_or_else(|| {
                name_table.get_name_first("FontSubfamilyName").unwrap_or_else(
                    || {
                        name_table
                            .get_name_first("FullFontName")
                            .unwrap_or("".to_string())
                    },
                )
            });
        // 优先使用变量字体的权重范围，否则从子族名称中提取
        ctx.fvar_table
            .clone()
            .map(|x| x.vf_weight)
            .unwrap_or(get_weight(&preferred_sub_family).to_string())
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pre_subset::fvar::FvarTable;
    use crate::pre_subset::name_table::NameTableSets;
    use crate::runner::{create_context, Context};
    use cn_font_proto::api_interface::input_template::CssProperties;
    use cn_font_proto::api_interface::output_report::NameTable;
    use cn_font_proto::api_interface::{InputTemplate, OutputReport};
    use harfbuzz_rs_now::Face;

    #[test]
    fn test_weight_detection() {
        // 基本权重测试
        assert_eq!(get_weight("thin"), 100);
        assert_eq!(get_weight("bold"), 700);
        assert_eq!(get_weight("regular"), 400);
        assert_eq!(get_weight("unknown"), 400); // 默认值

        // 组合权重测试
        assert_eq!(get_weight("ExtraLight"), 200);
        assert_eq!(get_weight("extra bold italic"), 800);
        assert_eq!(get_weight("ultra light regular"), 200);
        assert_eq!(get_weight("semi bold thin"), 600);

        // 大小写测试
        assert_eq!(get_weight("BOLD"), 700);
        assert_eq!(get_weight("Light"), 300);
        assert_eq!(get_weight("ExTrA BoLd"), 800);

        // 边界情况测试
        assert_eq!(get_weight(""), 400);
        assert_eq!(get_weight("not a weight"), 400);
        assert_eq!(get_weight("bold light"), 300); // 应该匹配最先的
    }

    #[test]
    fn test_extract_font_weight() {
        // 测试 CSS 属性中直接指定权重的情况
        let mut css = CssProperties::default();
        css.font_weight = Some("700".to_string());
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);
        let ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});
        let name_table = NameTableSets::default();
        assert_eq!(extract_font_weight(&css, &ctx, &name_table), "700");

        // 测试从 TypographicSubfamilyName 获取权重
        let css = CssProperties::default();
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);
        let ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});
        let name_table = NameTableSets {
            table: vec![NameTable {
                platform: "Windows".to_string(),
                language: "en".to_string(),
                name: "TypographicSubfamilyName".to_string(),
                value: "Bold".to_string(),
            }],
        };
        assert_eq!(extract_font_weight(&css, &ctx, &name_table), "700");

        // 测试从 FontSubfamilyName 获取权重
        let css = CssProperties::default();
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);
        let ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});
        let name_table = NameTableSets {
            table: vec![NameTable {
                platform: "Windows".to_string(),
                language: "en".to_string(),
                name: "FontSubfamilyName".to_string(),
                value: "Light".to_string(),
            }],
        };
        assert_eq!(extract_font_weight(&css, &ctx, &name_table), "300");

        // 测试从 FullFontName 获取权重
        let css = CssProperties::default();
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);
        let ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});
        let name_table = NameTableSets {
            table: vec![NameTable {
                platform: "Windows".to_string(),
                language: "en".to_string(),
                name: "FullFontName".to_string(),
                value: "Regular".to_string(),
            }],
        };
        assert_eq!(extract_font_weight(&css, &ctx, &name_table), "400");

        // 测试变量字体的权重
        let css = CssProperties::default();
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);
        let mut ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});
        ctx.fvar_table = Some(FvarTable {
            vf_weight: "100 500".to_string(),
            ..Default::default()
        });
        let name_table = NameTableSets::default();
        assert_eq!(extract_font_weight(&css, &ctx, &name_table), "100 500");

        // 测试默认权重情况
        let css = CssProperties::default();
        let mut reporter = OutputReport::default();
        let binary = vec![];
        let config = InputTemplate::default();
        let mut face = Face::from_bytes(&binary, 0);
        let ctx =
            create_context(&config, &binary, &mut face, &mut reporter, &|_| {});
        let name_table = NameTableSets::default();
        assert_eq!(extract_font_weight(&css, &ctx, &name_table), "400");
    }
}
