use opentype::layout::language;
use opentype::truetype::tables::names::language::{Macintosh, Windows};
use opentype::truetype::tables::names::{LanguageID, NameID, PlatformID};
use opentype::truetype::tables::Names;
use opentype::Font;
use std::io::Cursor;

type PlatformString = String;
type LanguageString = String;
type NameString = String;
type ValueString = String;

#[derive(Debug)]
pub struct NameTable {
    pub table: Vec<NameTableRow>,
}
#[derive(Debug)]
pub struct NameTableRow {
    language: String,
    platform: String,
    name: String,
    value: String,
}
impl NameTable {
    fn get_language(&self, str: &str) -> Vec<&NameTableRow> {
        self.table.iter().filter(|x| x.language == str).collect()
    }
    /// 默认获取 Windows 下面的 en 的标签，这个是用于机器看的
    pub fn get_name(
        &self,
        str: &str,
        platform: Option<&str>,
        language: Option<&str>,
    ) -> Vec<&NameTableRow> {
        let platform = platform.unwrap_or("Windows");
        let table = self.get_language(language.unwrap_or(&"en"));
        table
            .iter()
            .filter(|x| x.name == str && x.platform == platform)
            .map(|x| *x)
            .collect()
    }
}

/// 解析 name table 可以得知关于整个字体的头部信息
pub fn analyze_name_table(font: &Font, font_file: &mut Cursor<&Vec<u8>>) -> NameTable {
    let data: Names = font.take(font_file).unwrap().unwrap();
    let mut table = NameTable { table: vec![] };
    data.iter()
        .for_each(|((platform, _, language, name), value)| {
            let key = name_id_to_string(name);
            let void_language_tag_decode: [Option<&str>; 1] = [None];
            match value {
                Some(value) => {
                    table.table.push(NameTableRow {
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
        NameID::CopyrightNotice => "CopyrightNotice".to_string(),
        NameID::FontFamilyName => "FontFamilyName".to_string(),
        NameID::FontSubfamilyName => "FontSubfamilyName".to_string(),
        NameID::UniqueFontID => "UniqueFontID".to_string(),
        NameID::FullFontName => "FullFontName".to_string(),
        NameID::VersionString => "VersionString".to_string(),
        NameID::PostScriptFontName => "PostScriptFontName".to_string(),
        NameID::Trademark => "Trademark".to_string(),
        NameID::ManufacturerName => "ManufacturerName".to_string(),
        NameID::DesignerName => "DesignerName".to_string(),
        NameID::Description => "Description".to_string(),
        NameID::VendorURL => "VendorURL".to_string(),
        NameID::DesignerURL => "DesignerURL".to_string(),
        NameID::LicenseDescription => "LicenseDescription".to_string(),
        NameID::LicenseURL => "LicenseURL".to_string(),
        NameID::TypographicFamilyName => "TypographicFamilyName".to_string(),
        NameID::TypographicSubfamilyName => "TypographicSubfamilyName".to_string(),
        NameID::CompatibleFullFontName => "CompatibleFullFontName".to_string(),
        NameID::SampleText => "SampleText".to_string(),
        NameID::PostScriptCIDFindFontName => "PostScriptCIDFindFontName".to_string(),
        NameID::WWSFamilyName => "WWSFamilyName".to_string(),
        NameID::WWSSubfamilyName => "WWSSubfamilyName".to_string(),
        NameID::LightBackgroundPalette => "LightBackgroundPalette".to_string(),
        NameID::DarkBackgroundPalette => "DarkBackgroundPalette".to_string(),
        NameID::PostScriptVariationNamePrefix => "PostScriptVariationNamePrefix".to_string(),
        _ => "Other".to_string(),
    }
}

#[test]
fn test_name_table() {
    use crate::read_binary_file;
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
