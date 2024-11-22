use crate::expand_ranges;
use lazy_static::lazy_static;

pub fn u8_to_u32(arr: &[u8]) -> Vec<u32> {
    assert!(arr.len() % 4 == 0, "File length is not a multiple of 4");

    arr.chunks(4)
        .map(|chunk| u32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]) as u32)
        .collect()
}
pub fn u8_to_u16(arr: &[u8]) -> Vec<u16> {
    assert!(arr.len() % 2 == 0, "File length is not a multiple of 2");
    arr.chunks(2)
        .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]) as u16)
        .collect()
}

static HANGUL_SYL_SOURCE: &[u8] =
    include_bytes!("../../../../subsets/data/hangul-syl.dat");

static CN_CHAR_RANK: &[u8] =
    include_bytes!("../../../../subsets/data/cn_char_rank.dat");

fn get_part_from_cn_pkg(part_no: u8) -> Option<Vec<u32>> {
    let data = u8_to_u16(CN_CHAR_RANK);
    let mut last_index = 0;
    let mut part_no = part_no as isize;

    for (i, &element) in data.iter().enumerate() {
        if element == 0 {
            part_no -= 1;
            if part_no < 0 {
                return Some(data[last_index..i].to_vec().into_iter().map(|i|i as u32).collect::<Vec<u32>>());
            }
            last_index = i + 1;
        }
    }

    if part_no == 0 {
        return Some(data[last_index..].to_vec().into_iter().map(|i|i as u32).collect::<Vec<u32>>());
    }
    None
}

lazy_static! {
    pub static ref Zh_COMMON: Vec<u32> = get_part_from_cn_pkg(0).unwrap();
    pub static ref ZH_SC: Vec<u32> = get_part_from_cn_pkg(1).unwrap();
    pub static ref ZH_TC: Vec<u32> = get_part_from_cn_pkg(2).unwrap();


    pub static ref HANGUL_SYL: Vec<u32> = u8_to_u32(HANGUL_SYL_SOURCE);
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
        assert_eq!(Zh_COMMON.len(), 4329);
        assert_eq!(ZH_SC.len(), 2508);
        assert_eq!(ZH_TC.len(), 2481);
    }
}
