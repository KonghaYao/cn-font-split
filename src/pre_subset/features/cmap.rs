use log::warn;
use opentype::Font;
use opentype::truetype::tables::CharacterMapping;
use opentype::truetype::tables::character_mapping::{
    Encoding, Encoding0, Encoding4, Encoding6, Encoding12,
};
use std::collections::HashMap;
use std::io::Cursor;
pub fn analyze_cmap(
    font: &Font,
    font_file: &mut Cursor<&[u8]>,
) -> HashMap<u16, u32> {
    // GSUB
    let data: CharacterMapping = match font.take(font_file) {
        Ok(Some(data)) => data,
        Ok(None) => {
            // 缺少 cmap 时仅影响 GSUB/GPOS 的 glyph->unicode 反查，按空表继续。
            warn!("字体缺少 cmap 表");
            return HashMap::new();
        }
        Err(e) => {
            warn!("读取 cmap 表失败: {e}");
            return HashMap::new();
        }
    };
    let mut cmap: HashMap<u16, u32> = HashMap::new();
    fn inject_unicode_glyph_id_map(
        map: HashMap<u32, u16>,
        cmap: &mut HashMap<u16, u32>,
    ) {
        map.iter().for_each(|(k, v)| {
            cmap.insert(*v, *k);
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
            Encoding::Format14(_e) => {}
            Encoding::Unknown(_e) => {}
        }
    });
    cmap
}
