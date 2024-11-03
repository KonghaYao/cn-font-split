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
    loader: () =>
        UnicodeRange.parse(
            'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'.split(
                ',',
            ),
        ),
};
/**
 * Latin-ext 范围替换
 * @link https://npmmirror.com/package/@fontsource/noto-sans/files/400.css?version=5.0.22#L61
 * */
export const LatinExt: LanguageArea = {
    name: 'LatinExt',
    loader: () =>
        UnicodeRange.parse(
            'U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'.split(
                ',',
            ),
        ),
};

export const Vietnamese: LanguageArea = {
    name: 'Vietnamese',
    loader: () =>
        UnicodeRange.parse(
            'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB'.split(
                ',',
            ),
        ),
};
export const Greek: LanguageArea = {
    name: 'Greek',
    loader: () =>
        UnicodeRange.parse(
            'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF'.split(
                ',',
            ),
        ),
};
export const GreekExt: LanguageArea = {
    name: 'GreekExt',
    loader: () => UnicodeRange.parse(['U+1F00-1FFF']),
};

export const Cyrillic: LanguageArea = {
    name: 'Cyrillic',
    loader: () =>
        UnicodeRange.parse(
            'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'.split(','),
        ),
};
export const CyrillicExt = {
    name: 'CyrillicExt',
    loader: () =>
        UnicodeRange.parse(
            'U+0460-052F,U+1C80-1C88,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F'.split(
                ',',
            ),
        ),
};

/**
 * noto-sans-bengali
 * @link https://npmmirror.com/package/@fontsource/noto-sans-bengali/files/400.css?version=5.0.13#L1
 */
export const Bengali: LanguageArea = {
    name: 'Bengali',
    loader: () =>
        UnicodeRange.parse(
            'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1'.split(
                ',',
            ),
        ),
};

/**
 * noto-sans-devanagari
 * @link https://npmmirror.com/package/@fontsource/noto-sans-devanagari/files/400.css?version=5.0.13#L1
 */
export const Devanagari: LanguageArea = {
    name: 'Devanagari',
    loader: () =>
        UnicodeRange.parse(
            'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF,U+11B00-11B09'.split(
                ',',
            ),
        ),
};

/**
 * noto-sans-arabic
 * @link https://npmmirror.com/package/@fontsource/noto-sans-arabic/files/400.css?version=5.0.13#L8
 */
export const Arabic: LanguageArea = {
    name: 'Arabic',
    loader: () =>
        UnicodeRange.parse(
            'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0898-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC,U+102E0-102FB,U+10E60-10E7E,U+10EFD-10EFF,U+1EE00-1EE03,U+1EE05-1EE1F,U+1EE21-1EE22,U+1EE24,U+1EE27,U+1EE29-1EE32,U+1EE34-1EE37,U+1EE39,U+1EE3B,U+1EE42,U+1EE47,U+1EE49,U+1EE4B,U+1EE4D-1EE4F,U+1EE51-1EE52,U+1EE54,U+1EE57,U+1EE59,U+1EE5B,U+1EE5D,U+1EE5F,U+1EE61-1EE62,U+1EE64,U+1EE67-1EE6A,U+1EE6C-1EE72,U+1EE74-1EE77,U+1EE79-1EE7C,U+1EE7E,U+1EE80-1EE89,U+1EE8B-1EE9B,U+1EEA1-1EEA3,U+1EEA5-1EEA9,U+1EEAB-1EEBB,U+1EEF0-1EEF1,U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'.split(
                ',',
            ),
        ),
};

export const Thai = {
    name: 'Thai',
    loader: () =>
        UnicodeRange.parse('U+0E01-0E5B,U+200C-200D,U+25CC'.split(',')),
};

export const Khmer = {
    name: 'Khmer',
    loader: () =>
        UnicodeRange.parse(
            'U+1780-17FF,U+19E0-19FF,U+200C-200D,U+25CC'.split(','),
        ),
};
