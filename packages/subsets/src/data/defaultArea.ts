import {
    ZhCommon,
    ZhSC,
    ZhTC,
    HiraganaAndKatakana,
    HangulJamo,
    HangulSyl,
} from './CJKRange';
import {
    Latin,
    Greek,
    Cyrillic,
    Bengali,
    Devanagari,
    Arabic,
    Thai,
    Khmer,
    Tibetan,
    Mongolian,
    TaiLue,
    Yi,
    PhagsPa,
    Lisu,
    Buhid,
    Miao,
    Hani,
    Lahu,
    Va,
    Zhuang,
    NaxiDongba,
} from './LanguageRange';

// 默认语言区域，包括多个语言的Unicode字符范围
export const defaultArea = [
    Latin,
    Greek,
    Cyrillic,

    // 中文处理
    ZhCommon,
    ZhSC,
    ZhTC,
    // 日文处理
    HiraganaAndKatakana,

    // 韩文处理
    HangulJamo,
    HangulSyl,

    Bengali,
    Arabic,
    Devanagari,
    Thai,
    Khmer,
    Tibetan,
    Mongolian,
    TaiLue,
    Yi,
    PhagsPa,
    Lisu,
    Buhid,
    Miao,
    Hani,
    Lahu,
    Va,
    Zhuang,
    NaxiDongba,
];
