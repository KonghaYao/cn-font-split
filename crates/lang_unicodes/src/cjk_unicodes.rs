use crate::expand_ranges;
use cn_font_utils::u8_array_to_u16_array;
use lazy_static::lazy_static;

static HANGUL_SYL_SOURCE: &[u8] = include_bytes!("../data/hangul-syl.dat");

static CN_CHAR_RANK: &[u8] = include_bytes!("../data/cn_char_rank.dat");

fn get_part_from_cn_pkg(part_no: u8) -> Option<Vec<u32>> {
    let data = u8_array_to_u16_array(CN_CHAR_RANK);
    let mut last_index = 0;
    let mut part_no = part_no as isize;

    for (i, &element) in data.iter().enumerate() {
        if element == 0 {
            part_no -= 1;
            if part_no < 0 {
                return Some(
                    data[last_index..i]
                        .to_vec()
                        .into_iter()
                        .map(|i| i as u32)
                        .collect::<Vec<u32>>(),
                );
            }
            last_index = i + 1;
        }
    }

    if part_no == 0 {
        return Some(
            data[last_index..]
                .to_vec()
                .into_iter()
                .map(|i| i as u32)
                .collect::<Vec<u32>>(),
        );
    }
    None
}

lazy_static! {
    pub static ref ZH_SYMBOL: Vec<u32> = get_part_from_cn_pkg(0).unwrap();
    pub static ref ZH_SC: Vec<u32> = get_part_from_cn_pkg(1).unwrap();
    pub static ref ZH_TC: Vec<u32> = get_part_from_cn_pkg(2).unwrap();
    pub static ref HANGUL_SYL: Vec<u32> =
        u8_array_to_u16_array(HANGUL_SYL_SOURCE)
            .into_iter()
            .map(|x| x as u32)
            .collect();
    pub static ref HIRAGANA_AND_KATAKANA: Vec<u32> =
        expand_ranges(&[(0x3040, 0x309F), (0x30A0, 0x30FF)]);
    pub static ref HANGUL_JAMO: Vec<u32> = expand_ranges(&[(0x1100, 0x11FF)]);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test() {
        assert_eq!(HIRAGANA_AND_KATAKANA.len(), 192);
        assert_eq!(ZH_SYMBOL.len(), 74);
        assert_eq!(ZH_SC.len(), 7000);
        assert_eq!(ZH_TC.len(), 932);
        assert_eq!(HANGUL_SYL.len(), 2026);
        println!(
            "{}",
            ZH_SC
                .iter()
                .map(|i| { std::char::from_u32(i.clone()).unwrap() })
                .collect::<String>()
        )
    }
}
