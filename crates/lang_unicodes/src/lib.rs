use cjk_unicodes::{
    HANGUL_JAMO, HANGUL_SYL, HIRAGANA_AND_KATAKANA, ZH_SC, ZH_TC,
};
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
     * 0 不归入此，一般 0 是用于占位的
     */
    pub static ref LATIN: Vec<u32> = expand_ranges(&[(0x0001, 0x007F)]);
    pub static ref LATIN_1: Vec<u32> = expand_ranges(&[(0x0080, 0x00FF)]);
    pub static ref LATIN_EXT_A: Vec<u32> = expand_ranges(&[(0x0100, 0x017F)]);
    pub static ref LATIN_EXT_B: Vec<u32> = expand_ranges(&[(0x0180, 0x024F)]);



    pub static ref IPA_SYMBOLS: Vec<u32> = expand_ranges(&[(0x0250, 0x02FF)]);

    // 定义 ZH_SYMBOL 静态引用，包含特化处理的中文常用符号的 Unicode 码点
    // 参考 https://www.w3.org/International/clreq/#tables_of_chinese_punctuation_marks
    // 以及 https://zh.wikipedia.org/wiki/%E6%A0%87%E7%82%B9%E7%AC%A6%E5%8F%B7
    pub static ref ZH_SYMBOL: Vec<u32> = expand_ranges(&[
        // 句号
        (0x3002, 0x3002), // 。
        (0xFF0E, 0xFF0E), // ．
        // 逗号
        (0xFF0C, 0xFF0C), // ，
        // 顿号
        (0x3001, 0x3001), // 、
        // 冒号
        (0xFF1A, 0xFF1A), // ：
        // 分号
        (0xFF1B, 0xFF1B), // ；
        // 叹号
        (0xFF01, 0xFF01), // ！
        (0x203C, 0x203C), // ‼
        // 问号
        (0xFF1F, 0xFF1F), // ？
        (0x2047, 0x2047), // ⁇
        // 破折号
        (0x2E3A, 0x2E3A), // ⸺
        (0x2014, 0x2014), // ——
        // 省略号
        (0x2026, 0x2026), // …
        (0x22EF, 0x22EF), // ⋯
        // 连接号
        (0xFF5E, 0xFF5E), // ～
        (0x002D, 0x002D), // -
        (0x2013, 0x2013), // –
        // (0x2014, 0x2014), // — 与上面的破折号重复
        // 间隔号
        (0x00B7, 0x00B7), // ·
        (0x30FB, 0x30FB), // ・
        (0x2027, 0x2027), // ‧
        // 分隔号
        (0x002F, 0x002F), // /
        (0xFF0F, 0xFF0F), // ／
        // 引号
        (0x300C, 0x300D), // 「」
        (0x300E, 0x300F), // 『』
        (0x201C, 0x201D), // “”
        (0x2018, 0x2019), // ‘’
        // 括号
        (0xFF08, 0xFF09), // （）
        // 书名号
        (0x300A, 0x300B), // 《》
        (0x3008, 0x3009), // 〈〉
        // 其他夹注符号
        (0x3010, 0x3011), // 【】
        (0x3016, 0x3017), // 〖〗
        (0x3014, 0x3015), // 〔〕
        (0x3018, 0x3019), // 〘〙
        (0xFF3B, 0xFF3B), // ［
        (0xFF3D, 0xFF3D), // ］
        (0xFF5B, 0xFF5B), // ｛
        (0xFF5D, 0xFF5D), // ｝
        // 行间标号
        (0xFF3F, 0xFF3F), // ＿
        (0xFE4F, 0xFE4F), // ﹏
        (0x25CF, 0x25CF), // ●
        (0x2022, 0x2022), // •
        // 额外补充
        (0xFF0D, 0xFF0D), // －（全角连字符）
        (0xFF5C, 0xFF5C), // ｜（全角竖线）
        (0xFE41, 0xFE42), // ﹁﹂
        (0xFE43, 0xFE44), // ﹃﹄
    ]);

    pub static ref HALFWIDTH_FULLWIDTH: Vec<u32> = expand_ranges(&[(0xFF00, 0xFFEF)]);

    pub static ref GREEK: Vec<u32> = expand_ranges(&[(0x0370, 0x03FF), (0x1F00, 0x1FFF)]);

    /// 西里尔文范围
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
        assert_eq!(LATIN.len(), 127)
    }
}

pub fn create_default_unicode_area() -> [Vec<u32>; 32] {
    [
        LATIN.to_vec(),
        LATIN_1.to_vec(),
        LATIN_EXT_A.to_vec(),
        LATIN_EXT_B.to_vec(),
        IPA_SYMBOLS.to_vec(),
        GREEK.to_vec(),
        CYRILLIC.to_vec(),
        // 中文处理
        ZH_SYMBOL.to_vec(),
        ZH_SC.to_vec(),
        ZH_TC.to_vec(),
        // 日文处理
        HIRAGANA_AND_KATAKANA.to_vec(),
        // 韩文处理
        HANGUL_JAMO.to_vec(),
        HANGUL_SYL.to_vec(),
        BENGALI.to_vec(),
        ARABIC.to_vec(),
        DEVANAGARI.to_vec(),
        THAI.to_vec(),
        KHMER.to_vec(),
        TIBETAN.to_vec(),
        MONGOLIAN.to_vec(),
        TAI_LUE.to_vec(),
        YI.to_vec(),
        PHAGS_PA.to_vec(),
        LISU.to_vec(),
        BUHID.to_vec(),
        MIAO.to_vec(),
        HANI.to_vec(),
        LAHU.to_vec(),
        VA.to_vec(),
        ZHUANG.to_vec(),
        NAXI_DONGBA.to_vec(),
        HALFWIDTH_FULLWIDTH.to_vec(),
    ]
}
pub fn create_default_unicode_area_tag() -> [&'static str; 32] {
    [
        "LATIN",
        "LATIN_1",
        "LATIN_EXT_A",
        "LATIN_EXT_B",
        "IPA_SYMBOLS",
        "GREEK",
        "CYRILLIC",
        // 中文处理
        "ZH_SYMBOL",
        "ZH_SC",
        "ZH_TC",
        // 日文处理
        "HIRAGANA_AND_KATAKANA",
        // 韩文处理
        "HANGUL_JAMO",
        "HANGUL_SYL",
        "BENGALI",
        "ARABIC",
        "DEVANAGARI",
        "THAI",
        "KHMER",
        "TIBETAN",
        "MONGOLIAN",
        "TAI_LUE",
        "YI",
        "PHAGS_PA",
        "LISU",
        "BUHID",
        "MIAO",
        "HANI",
        "LAHU",
        "VA",
        "ZHUANG",
        "NAXI_DONGBA",
        "HALFWIDTH_FULLWIDTH",
    ]
}
