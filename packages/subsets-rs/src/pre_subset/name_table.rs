use opentype::truetype::tables::names::{NameID, PlatformID};
use opentype::truetype::tables::Names;
use opentype::Font;
use std::io::Cursor;

use crate::protos::output_report::NameTable;

#[derive(Debug)]
pub struct NameTableSets {
    pub table: Vec<NameTable>,
}
impl NameTableSets {
    fn get_language(&self, str: &str) -> Vec<&NameTable> {
        self.table.iter().filter(|x| x.language == str).collect()
    }
    /// 默认获取 Windows 下面的 en 的标签，这个是用于机器看的
    pub fn get_name(
        &self,
        str: &str,
        platform: Option<&str>,
        language: Option<&str>,
    ) -> Vec<&NameTable> {
        let platform = platform.unwrap_or("Windows");
        let table = self.get_language(language.unwrap_or(&"en"));
        table
            .iter()
            .filter(|x| x.name == str && x.platform == platform)
            .map(|x| *x)
            .collect()
    }
    pub fn get_name_first(&self, str: &str) -> Option<String> {
        match self.get_name(str, None, None).get(0) {
            Some(val) => Option::from(val.value.clone()),
            _ => None,
        }
    }
}

/// 解析 name table 可以得知关于整个字体的头部信息
pub fn analyze_name_table(
    font: &Font,
    font_file: &mut Cursor<&Vec<u8>>,
) -> NameTableSets {
    let data: Names = font.take(font_file).unwrap().unwrap();
    let mut table = NameTableSets { table: vec![] };
    data.iter().for_each(|((platform, _, language, name), value)| {
        let key = name_id_to_string(name);
        let void_language_tag_decode: [Option<&str>; 1] = [None];
        match value {
            Some(value) => {
                table.table.push(NameTable {
                    language: language
                        .tag(&void_language_tag_decode)
                        .unwrap_or("en")
                        .to_string(),
                    platform: platform_to_string(platform),
                    name: key,
                    value,
                });
            }
            None => {}
        };
    });
    table
}

pub fn platform_to_string(platform_id: PlatformID) -> String {
    match platform_id {
        PlatformID::Unicode => "Unicode".to_string(),
        PlatformID::Macintosh => "Macintosh".to_string(),
        PlatformID::Windows => "Windows".to_string(),
    }
}

pub fn name_id_to_string(name_id: NameID) -> String {
    match name_id {
        NameID::CopyrightNotice => "CopyrightNotice".to_string(), // 版权声明
        NameID::FontFamilyName => "FontFamilyName".to_string(), // 字体家族名称
        NameID::FontSubfamilyName => "FontSubfamilyName".to_string(), // 字体子家族名称
        NameID::UniqueFontID => "UniqueFontID".to_string(), // 唯一字体标识
        NameID::FullFontName => "FullFontName".to_string(), // 完整字体名称
        NameID::VersionString => "VersionString".to_string(), // 版本字符串
        NameID::PostScriptFontName => "PostScriptFontName".to_string(), // PostScript 字体名称
        NameID::Trademark => "Trademark".to_string(),                   // 商标
        NameID::ManufacturerName => "ManufacturerName".to_string(), // 制造商名称
        NameID::DesignerName => "DesignerName".to_string(), // 设计师名称
        NameID::Description => "Description".to_string(),   // 描述
        NameID::VendorURL => "VendorURL".to_string(),       // 供应商 URL
        NameID::DesignerURL => "DesignerURL".to_string(),   // 设计师 URL
        NameID::LicenseDescription => "LicenseDescription".to_string(), // 许可证描述
        NameID::LicenseURL => "LicenseURL".to_string(), // 许可证 URL
        NameID::TypographicFamilyName => "TypographicFamilyName".to_string(), // 排版家族名称
        NameID::TypographicSubfamilyName => {
            "TypographicSubfamilyName".to_string()
        } // 排版子家族名称
        NameID::CompatibleFullFontName => "CompatibleFullFontName".to_string(), // 兼容的完整字体名称
        NameID::SampleText => "SampleText".to_string(), // 示例文本
        NameID::PostScriptCIDFindFontName => {
            "PostScriptCIDFindFontName".to_string()
        } // PostScript CID 查找字体名称
        NameID::WWSFamilyName => "WWSFamilyName".to_string(), // WWS 家族名称
        NameID::WWSSubfamilyName => "WWSSubfamilyName".to_string(), // WWS 子家族名称
        NameID::LightBackgroundPalette => "LightBackgroundPalette".to_string(), // 浅色背景调色板
        NameID::DarkBackgroundPalette => "DarkBackgroundPalette".to_string(), // 深色背景调色板
        NameID::PostScriptVariationNamePrefix => {
            "PostScriptVariationNamePrefix".to_string()
        } // PostScript 变体名称前缀
        _ => "Other".to_string(), // 其他
    }
}

#[test]
fn test_name_table() {
    use cn_font_utils::read_binary_file;
    let path = "../demo/public/SmileySans-Oblique.ttf";
    let file_binary = read_binary_file(&path).expect("Failed to read file");
    let mut font_file = Cursor::new(&file_binary);
    let font = Font::read(&mut font_file).expect("TODO: panic message");
    let data = analyze_name_table(&font, &mut font_file);

    // data.table.iter().for_each(|x| {
    //     println!("{:?}", x);
    // });

    assert_eq!(
        data.get_name("FontFamilyName", None, None)[0].value,
        "Smiley Sans Oblique"
    )
}
