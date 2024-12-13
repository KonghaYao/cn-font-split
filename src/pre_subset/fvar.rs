use opentype::tables::FontVariations;
use opentype::truetype::q32;
use opentype::Font;
use std::io::Cursor;

#[derive(Default, Clone)]
pub struct FvarTable {
    pub vf_weight: String,
    pub vf_default_weight: String,
}
/// 解析 fvar table 可以得知可变字体的信息
pub fn analyze_fvar_table(
    font: &Font,
    font_file: &mut Cursor<&Vec<u8>>,
) -> Option<FvarTable> {
    let data: Option<FontVariations> = font.take(font_file).unwrap();
    if data.is_none() {
        return None;
    }

    let mut vf = FvarTable::default();
    data.unwrap().axis_records.iter().for_each(|x| {
        let tag = x.tag.as_str().unwrap_or("");
        if tag == "wght".to_string() {
            let max = q32_to_int_truncate(x.max_value);
            let min = q32_to_int_truncate(x.min_value);
            let font_weight = format!("{} {}", min, max).clone();
            vf.vf_weight = font_weight;
            vf.vf_default_weight =
                q32_to_int_truncate(x.default_value).to_string();
        }
    });
    Some(vf)
}
pub fn q32_to_int_truncate(input: q32) -> i32 {
    input.0 >> 16
}
#[test]
fn test_fvar_table() {
    use cn_font_utils::read_binary_file;
    let path = "./packages/demo/public/WorkSans-VariableFont_wght.ttf";
    let file_binary = read_binary_file(&path).expect("Failed to read file");
    let mut font_file = Cursor::new(&file_binary);
    let font = Font::read(&mut font_file).expect("TODO: panic message");
    let data = analyze_fvar_table(&font, &mut font_file).unwrap();

    assert_eq!(data.vf_default_weight, "400");
    assert_eq!(data.vf_weight, "100 900")
    // data.table.iter().for_each(|x| {
    //     println!("{:?}", x);
    // });

    // assert_eq!()
}
