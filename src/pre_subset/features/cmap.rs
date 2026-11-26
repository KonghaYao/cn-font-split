use crate::pre_subset::features::opentype::TableError;
use opentype::Font;
use opentype::truetype::tables::CharacterMapping;
use opentype::truetype::tables::character_mapping::{
    Encoding, Encoding0, Encoding4, Encoding6, Encoding12,
};
use std::collections::HashMap;
use std::io::Cursor;

/// 解析 cmap，返回「glyph id → unicode」反查表。
///
/// 失败时带表名/偏移返回 [`TableError`]，由调用方记录并回退空表。
pub fn analyze_cmap(
    font: &Font,
    font_file: &mut Cursor<&[u8]>,
) -> Result<HashMap<u16, u32>, TableError> {
    let data: CharacterMapping = match font.take(font_file) {
        Ok(Some(data)) => data,
        Ok(None) => return Err(TableError::missing(font, b"cmap", "cmap")),
        Err(e) => {
            return Err(TableError::read(font, b"cmap", "cmap", e.to_string()));
        }
    };
    let mut cmap: HashMap<u16, u32> = HashMap::new();
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
    Ok(cmap)
}

/// 把「unicode → glyph id」注入成「glyph id → unicode」的反查表。
///
/// 同一 glyph 可能对应多个 unicode（CJK 兼容区、竖排变体、重复字形等）。
/// 直接遍历 `HashMap` 注入时，「最后写入者获胜」的结果取决于每个进程随机的
/// 哈希迭代顺序，会让共享字符在分包间漂移、进而改变文件名 hash（跨运行不可复现）。
/// 这里按 unicode 降序注入：同一 encoding 内最小 unicode 稳定获胜，
/// 同时保持原有的「后处理的 encoding 覆盖先前的」优先级。
fn inject_unicode_glyph_id_map(
    map: HashMap<u32, u16>,
    cmap: &mut HashMap<u16, u32>,
) {
    let mut entries: Vec<(u32, u16)> = map.into_iter().collect();
    entries.sort_unstable_by(|a, b| b.0.cmp(&a.0));
    for (unicode, glyph_id) in entries {
        cmap.insert(glyph_id, unicode);
    }
}

#[cfg(test)]
mod tests {
    use super::inject_unicode_glyph_id_map;
    use std::collections::HashMap;

    #[test]
    fn shared_glyph_picks_smallest_unicode_deterministically() {
        let mut map = HashMap::new();
        map.insert(0x4E00_u32, 7_u16);
        map.insert(0x2F00_u32, 7_u16);
        map.insert(0x0041_u32, 7_u16);
        let mut cmap = HashMap::new();
        inject_unicode_glyph_id_map(map, &mut cmap);
        assert_eq!(cmap.get(&7), Some(&0x0041));
    }

    #[test]
    fn later_encoding_still_overrides_earlier_one() {
        let mut cmap = HashMap::new();
        let mut first = HashMap::new();
        first.insert(0x4E00_u32, 9_u16);
        inject_unicode_glyph_id_map(first, &mut cmap);
        let mut second = HashMap::new();
        second.insert(0x3000_u32, 9_u16);
        inject_unicode_glyph_id_map(second, &mut cmap);
        assert_eq!(cmap.get(&9), Some(&0x3000));
    }
}
