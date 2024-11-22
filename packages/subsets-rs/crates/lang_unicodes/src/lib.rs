use lazy_static::lazy_static;
pub mod cjk_unicodes;
pub fn expand_ranges(ranges: &[(u32, u32)]) -> Vec<u32> {
    ranges
        .iter()
        .flat_map(|&(start, end)| (start..=end).collect::<Vec<u32>>())
        .collect()
}
lazy_static! {
    /**
     * Latin 范围替换
     * @link https://npmmirror.com/package/@fontsource/noto-sans/files/400.css?version=5.0.22#L61
     * 0 不归入此，一般 0 是用于占位的
     */
    pub static ref LATIN: Vec<u32> = expand_ranges(&[(0x0001, 0x024F)]);
    pub static ref GREEK: Vec<u32> = expand_ranges(&[(0x0370, 0x03FF), (0x1F00, 0x1FFF)]);

    /**
     * 西里尔文范围
     */
    pub static ref CYRILLIC: Vec<u32> = expand_ranges(&[
        (0x0400, 0x052F),
        (0x1C80, 0x1C8F),
        (0x2DE0, 0x2DFF),
        (0xA640, 0xA69F)
    ]);

    /**
     * 阿拉伯文范围
     */
    pub static ref ARABIC: Vec<u32> = expand_ranges(&[
        (0x0600, 0x06FF),
        (0x0750, 0x077F),
        (0x0870, 0x08FF),
        (0xFB50, 0xFDFF),
        (0xFE70, 0xFEFF)
    ]);

    /**
     * 孟加拉语
     */
    pub static ref BENGALI: Vec<u32> = expand_ranges(&[(0x0980, 0x09FF)]);

    /**
     * 天城文
     */
    pub static ref DEVANAGARI: Vec<u32> = expand_ranges(&[
        (0x0900, 0x097F),
        (0xA8E0, 0xA8FF),
        (0x11B00, 0x11B5F)
    ]);

    /** 泰文 */
    pub static ref THAI: Vec<u32> = expand_ranges(&[(0x0E00, 0x0E7F)]);

    /** 高棉 */
    pub static ref KHMER: Vec<u32> = expand_ranges(&[
        (0x1780, 0x17FF),
        (0x19E0, 0x19FF)
    ]);

    // 少数民族的文字

    /** 藏文 */
    pub static ref TIBETAN: Vec<u32> = expand_ranges(&[(0x0F00, 0x0FFF)]);

    /** 蒙古文 */
    pub static ref MONGOLIAN: Vec<u32> = expand_ranges(&[(0x1800, 0x18AF)]);

    /** 傣文 */
    pub static ref TAI_LE: Vec<u32> = expand_ranges(&[(0x1950, 0x197F)]);

    /** 西双版纳傣文 */
    pub static ref TAI_LUE: Vec<u32> = expand_ranges(&[(0x1980, 0x19DF)]);

    /** 彝文 */
    pub static ref YI: Vec<u32> = expand_ranges(&[
        (0xA000, 0xA48F),
        (0xA490, 0xA4C6)
    ]);

    /** 八思巴文 */
    pub static ref PHAGS_PA: Vec<u32> = expand_ranges(&[(0xA840, 0xA87F)]);

    /**
     * 朝鲜文
     * 采用韩文的解析方式
     */

    /** 傈僳文 */
    pub static ref LISU: Vec<u32> = expand_ranges(&[(0x10C00, 0x10C4F)]);

    /** 布依文 */
    pub static ref BUHID: Vec<u32> = expand_ranges(&[(0x1740, 0x175F)]);

    /** 苗文 */
    pub static ref MIAO: Vec<u32> = expand_ranges(&[(0x16F00, 0x16F9F)]);

    /** 哈尼文 */
    pub static ref HANI: Vec<u32> = expand_ranges(&[(0x13A0, 0x13F5)]);

    /** 拉祜文 */
    pub static ref LAHU: Vec<u32> = expand_ranges(&[(0x10900, 0x1091F)]);

    /** 佤文 */
    pub static ref VA: Vec<u32> = expand_ranges(&[(0x10A00, 0x10A5F)]);

    /** 壮文 */
    pub static ref ZHUANG: Vec<u32> = expand_ranges(&[(0x10D30, 0x10D7F)]);

    /** 纳西文 */
    pub static ref NAXI_DONGBA: Vec<u32> = expand_ranges(&[(0x10FB0, 0x10FDF)]);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test() {
        assert_eq!(LATIN.len(), 591)
    }
}
