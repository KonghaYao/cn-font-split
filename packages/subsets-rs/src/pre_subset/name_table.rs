use opentype::truetype::tables::names::{NameID, PlatformID};
use std::io::Cursor;
use opentype::Font;
use opentype::truetype::tables::Names;
pub type NameTable = Vec<(String, String, String)>;

/// 解析 name table 可以得知关于整个字体的头部信息
pub fn analyze_name_table(font: &Font, font_file: &mut Cursor<&Vec<u8>>) -> NameTable {
    let data: Names = font.take(font_file).unwrap().unwrap();
    let mut table: NameTable = vec![];
    data.iter().for_each(|((platform, _, __, name), value)| {
        let key = name_id_to_string(name);
        table.push((platform_to_string(platform), key, value.unwrap_or("".to_string())));
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
        NameID::CopyrightNotice => "Copyright Notice".to_string(),
        NameID::FontFamilyName => "Font Family Name".to_string(),
        NameID::FontSubfamilyName => "Font Subfamily Name".to_string(),
        NameID::UniqueFontID => "Unique Font ID".to_string(),
        NameID::FullFontName => "Full Font Name".to_string(),
        NameID::VersionString => "Version String".to_string(),
        NameID::PostScriptFontName => "PostScript Font Name".to_string(),
        NameID::Trademark => "Trademark".to_string(),
        NameID::ManufacturerName => "Manufacturer Name".to_string(),
        NameID::DesignerName => "Designer Name".to_string(),
        NameID::Description => "Description".to_string(),
        NameID::VendorURL => "Vendor URL".to_string(),
        NameID::DesignerURL => "Designer URL".to_string(),
        NameID::LicenseDescription => "License Description".to_string(),
        NameID::LicenseURL => "License URL".to_string(),
        NameID::TypographicFamilyName => "Typographic Family Name".to_string(),
        NameID::TypographicSubfamilyName => "Typographic Subfamily Name".to_string(),
        NameID::CompatibleFullFontName => "Compatible Full Font Name".to_string(),
        NameID::SampleText => "Sample Text".to_string(),
        NameID::PostScriptCIDFindFontName => "PostScript CID Find Font Name".to_string(),
        NameID::WWSFamilyName => "WWS Family Name".to_string(),
        NameID::WWSSubfamilyName => "WWS Subfamily Name".to_string(),
        NameID::LightBackgroundPalette => "Light Background Palette".to_string(),
        NameID::DarkBackgroundPalette => "Dark Background Palette".to_string(),
        NameID::PostScriptVariationNamePrefix => "PostScript Variation Name Prefix".to_string(),
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
    // println!("Decoded: {:?}", decoded);
    let data = analyze_name_table(&font, &mut font_file);
    data.iter().for_each(|(platform_id, key, value)| {
        assert_eq!(platform_id.is_ascii(), true);
        assert_eq!(key.is_ascii(), true);
        assert_eq!(value.is_empty(), false);
    })
}