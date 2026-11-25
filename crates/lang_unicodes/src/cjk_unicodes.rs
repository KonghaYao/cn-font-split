use crate::expand_ranges;
use cn_font_utils::u8_array_to_u16_array;
use std::sync::LazyLock;

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
                        .iter()
                        .map(|i| *i as u32)
                        .collect::<Vec<u32>>(),
                );
            }
            last_index = i + 1;
        }
    }

    if part_no == 0 {
        return Some(
            data[last_index..].iter().map(|i| *i as u32).collect::<Vec<u32>>(),
        );
    }
    None
}

pub static ZH_SYMBOL: LazyLock<Vec<u32>> =
    LazyLock::new(|| get_part_from_cn_pkg(0).unwrap());
pub static ZH_SC: LazyLock<Vec<u32>> =
    LazyLock::new(|| get_part_from_cn_pkg(1).unwrap());
pub static ZH_TC: LazyLock<Vec<u32>> =
    LazyLock::new(|| get_part_from_cn_pkg(2).unwrap());
pub static HANGUL_SYL: LazyLock<Vec<u32>> = LazyLock::new(|| {
    u8_array_to_u16_array(HANGUL_SYL_SOURCE)
        .into_iter()
        .map(|x| x as u32)
        .collect()
});
pub static HIRAGANA_AND_KATAKANA: LazyLock<Vec<u32>> =
    LazyLock::new(|| expand_ranges(&[(0x3040, 0x309F), (0x30A0, 0x30FF)]));
pub static HANGUL_JAMO: LazyLock<Vec<u32>> =
    LazyLock::new(|| expand_ranges(&[(0x1100, 0x11FF)]));

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test() {
        assert_eq!(HIRAGANA_AND_KATAKANA.len(), 192);
        // 三段数据来自 examples/gen_unicodes.rs 生成的 data/cn_char_rank.dat，
        // 以 u16 0 分隔，实测分段长度依次为 75 / 6767 / 2306。
        // 75 个符号中 17 个全角/私用区标点在源列表里重复出现（去重后 58）。
        assert_eq!(ZH_SYMBOL.len(), 75);
        assert_eq!(ZH_SC.len(), 6767);
        assert_eq!(ZH_TC.len(), 2306);
        assert_eq!(HANGUL_SYL.len(), 2026);
        println!(
            "{}",
            ZH_SC
                .iter()
                .map(|i| { std::char::from_u32(*i).unwrap() })
                .collect::<String>()
        )
    }
}
