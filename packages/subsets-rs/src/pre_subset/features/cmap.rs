use opentype::truetype::tables::character_mapping::{
    Encoding, Encoding0, Encoding12, Encoding4, Encoding6,
};
use opentype::truetype::tables::CharacterMapping;
use opentype::Font;
use std::collections::HashMap;
use std::io::Cursor;
pub fn analyze_cmap(
    font: &Font,
    font_file: &mut Cursor<&Vec<u8>>,
) -> HashMap<u16, u32> {
    // GSUB
    let data: CharacterMapping = font.take(font_file).unwrap().unwrap();
    let mut cmap: HashMap<u16, u32> = HashMap::new();
    fn inject_unicode_glyph_id_map(
        map: HashMap<u32, u16>,
        cmap: &mut HashMap<u16, u32>,
    ) {
        map.iter().for_each(|(k, v)| {
            cmap.insert(v.clone(), k.clone() as u32);
        })
    }
    data.encodings.iter().for_each(|e| {
        match e {
            Encoding::Format0(e) => {
                // e.glyph_ids.iter().enumerate().for_each(|(index, glyph_id)| {
                //     // 因为这个固定是由 0x80 开始的
                //     cmap.insert(0x80 + glyph_id.clone() as u32, index as u32).unwrap();
                // })
                let map = Encoding0::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap);
            }
            Encoding::Format4(e) => {
                let map = Encoding4::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap)
            }
            Encoding::Format6(e) => {
                let map = Encoding6::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap)
            }
            Encoding::Format12(e) => {
                let map = Encoding12::mapping::<u32>(e);
                inject_unicode_glyph_id_map(map, &mut cmap)
            }
            Encoding::Format14(e) => {}
            Encoding::Unknown(e) => {}
        }
    });
    cmap
}
