// 关于各语言在 Unicode 中的区域的定义文件
import { UnicodeRange } from '@japont/unicode-range';
//https://unicode.org/charts/nameslist/

export interface LanguageArea {
    name: string;
    loader: () => number[] | Promise<number[]>;
}

/**
 * Latin 范围替换
 * @link https://npmmirror.com/package/@fontsource/noto-sans/files/400.css?version=5.0.22#L61
 * */
export const Latin: LanguageArea = {
    name: 'Latin',
    loader: () => UnicodeRange.parse('U+0000-024F'.split(',')),
};

export const Greek: LanguageArea = {
    name: 'Greek',
    loader: () => UnicodeRange.parse('U+0370-03FF,U+1F00-1FFF'.split(',')),
};

export const Cyrillic: LanguageArea = {
    name: 'Cyrillic',
    loader: () =>
        UnicodeRange.parse(
            'U+0400-052f,U+1C80-1C8F,U+2DE0-2DFF,U+A640-A69F'.split(','),
        ),
};

/**
 * 阿拉伯文范围
 */
export const Arabic: LanguageArea = {
    name: 'Arabic',
    loader: () =>
        UnicodeRange.parse(
            'U+0600-06FF,U+0750-077F,U+0870-08FF,U+FB50-FDFF,U+FE70-FEFF'.split(
                ',',
            ),
        ),
};

/**
 * 孟加拉语
 */
export const Bengali: LanguageArea = {
    name: 'Bengali',
    loader: () => UnicodeRange.parse('U+0980-09FF'.split(',')),
};

/**
 * 天城文
 */
export const Devanagari: LanguageArea = {
    name: 'Devanagari',
    loader: () =>
        UnicodeRange.parse('U+0900-097F,U+A8E0-A8FF,U+11B00-11B5F'.split(',')),
};

/** 泰文 */
export const Thai = {
    name: 'Thai',
    loader: () => UnicodeRange.parse('U+0E00-0E7F'.split(',')),
};

/** 高棉 */
export const Khmer = {
    name: 'Khmer',
    loader: () => UnicodeRange.parse('U+1780-17FF,U+19E0-19FF'.split(',')),
};

// 少数民族的文字

/** 藏文 */
export const Tibetan = {
    name: 'Tibetan',
    loader: () => UnicodeRange.parse('U+0F00-0FFF'.split(',')),
};
/** 蒙古文 */
export const Mongolian = {
    name: 'Mongolian',
    loader: () => UnicodeRange.parse('U+1800-18AF'.split(',')),
};

/** 傣文 */
export const TaiLe = {
    name: 'Tai Le',
    loader: () => UnicodeRange.parse('U+1950-197F'.split(',')),
};

/** 西双版纳傣文 */
export const TaiLue = {
    name: 'Tai Lue',
    loader: () => UnicodeRange.parse('U+1980-19DF'.split(',')),
};

/** 彝文 */
export const Yi = {
    name: 'Yi',
    loader: () => UnicodeRange.parse('U+A000-A48F,U+A490-A4C6'.split(',')),
};

/** 八思巴文 */
export const PhagsPa = {
    name: 'Phags-pa',
    loader: () => UnicodeRange.parse('U+A840-A87F'.split(',')),
};

/**
 * 朝鲜文
 * 采用韩文的解析方式
 */

/** 傈僳文 */
export const Lisu = {
    name: 'Lisu',
    loader: () => UnicodeRange.parse('U+10C00-10C4F'.split(',')),
};

/** 布依文 */
export const Buhid = {
    name: 'Buhid',
    loader: () => UnicodeRange.parse('U+1740-175F'.split(',')),
};

/** 苗文 */
export const Miao = {
    name: 'Miao',
    loader: () => UnicodeRange.parse('U+16F00-16F9F'.split(',')),
};

/** 哈尼文 */
export const Hani = {
    name: 'Hani',
    loader: () => UnicodeRange.parse('U+13A0-13F5'.split(',')),
};

/** 拉祜文 */
export const Lahu = {
    name: 'Lahu',
    loader: () => UnicodeRange.parse('U+10900-1091F'.split(',')),
};

/** 佤文 */
export const Va = {
    name: 'Va',
    loader: () => UnicodeRange.parse('U+10A00-10A5F'.split(',')),
};

/** 壮文 */
export const Zhuang = {
    name: 'Zhuang',
    loader: () => UnicodeRange.parse('U+10D30-10D7F'.split(',')),
};

/** 纳西文 */
export const NaxiDongba = {
    name: 'Naxi Dongba',
    loader: () => UnicodeRange.parse('U+10FB0-10FDF'.split(',')),
};
