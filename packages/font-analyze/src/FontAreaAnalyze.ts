import { FontEditor, TTF } from "fonteditor-core";

const CharAreas_Translate: Record<keyof typeof CharAreas, string> = {
    Latin: "拉丁文",
    CJK_Base: "标准CJK文字",
    CJK_Symbol:
        "全角ASCII、全角中英文标点、半宽片假名、半宽平假名、半宽韩文字母",
    CJK_Radicals: "CJK部首补充",
    CJK_Punctuation: "CJK标点符号",
    CJK_Strokes: "CJK笔划",
    C_KangxiRadical: "康熙部首",
    C_CharStructure: "汉字结构描述字符",
    PhoneticNotation: "注音符号",
    C_PhoneticNotation1: "注音符号（闽南语、客家语扩展）",
    J_Hiragana: "日文平假名",
    J_Katakana: "日文片假名",
    J_Katakana1: "日文片假名拼音扩展",
    K_Spell: "韩文拼音",
    K_Letter: "韩文字母",
    K_Letter1: "韩文兼容字母",
    C_Symbol: "太玄经符号",
    C_Symbol1: "易经六十四卦象",
    C_Symbol2: "彝文音节",
    C_syllable: "彝文部首",
    Braille: "盲文符号",
    CJK_Symbol1: "CJK字母及月份",
    CJK_Symbol2: "CJK特殊符号（日期合并）",
    DecorativeSymbol: "装饰符号（非CJK专用）",
    Miscellaneous_Symbol: "杂项符号（非CJK专用）",
    C_Punctuation: "中文竖排标点",
    CJK_Symbol3: "CJK兼容符号（竖排变体、下划线、顿号）",

    Latin1: "Latin1 补充",
    Latin_A: "Latin 拉丁字母扩展 A",
    Latin_B: "Latin 拉丁字母扩展 B",
    Cedilla: "变音符号",
    GreekAndCoptic: "希腊字母&科普特字母",
    Cyrillic: "西里尔字母",
    Cyrillic_1: "西里尔字母补充",
};

/** 字符区间，参考 https://blog.csdn.net/Kevin__Mei/article/details/112778960 */
const CharAreas = {
    /** 拉丁文 */
    Latin: [[0x0020, 0x007f]],
    /** Latin1 补充 */
    Latin1: [[0x0080, 0x00ff]],
    /** Latin（拉丁字母）扩展 A */
    Latin_A: [[0x0100, 0x017f]],
    /** Latin（拉丁字母）扩展 B */
    Latin_B: [[0x0180, 0x024f]],
    /** 变音符号 */
    Cedilla: [[0x0300, 0x036f]],
    /** 希腊字母&科普特字母 */
    GreekAndCoptic: [[0x0370, 0x03ff]],
    /** 西里尔字母 */
    Cyrillic: [[0x0400, 0x04ff]],
    /** 西里尔字母补充 */
    Cyrillic_1: [[0x0500, 0x052f]],

    /** 标准CJK文字 */
    CJK_Base: [
        [0x3400, 0x4db5],
        [0x4e00, 0x9fa5],
        [0x9fa6, 0x9fbb],
        [0xf900, 0xfa2d],
        [0xfa30, 0xfa6a],
        [0xfa70, 0xfad9],
        [0x20000, 0x2a6d6],
        [0x2f800, 0x2fa1d],
    ],
    /** 全角ASCII、全角中英文标点、半宽片假名、半宽平假名、半宽韩文字母：FF00-FFEF */
    CJK_Symbol: [[0xff00, 0xffef]],
    /** CJK部首补充：2E80-2EFF */
    CJK_Radicals: [[0x2e80, 0x2eff]],
    /** CJK标点符号：3000-303F */
    CJK_Punctuation: [[0x3000, 0x303f]],
    /** CJK笔划：31C0-31EF */
    CJK_Strokes: [[0x31c0, 0x31ef]],
    /** 康熙部首：2F00-2FDF */
    C_KangxiRadical: [[0x2f00, 0x2fdf]],
    /**7）汉字结构描述字符：2FF0-2FFF */
    C_CharStructure: [[0x2ff0, 0x2fff]],
    /**8）注音符号：3100-312F */
    PhoneticNotation: [[0x3100, 0x312f]],
    /**9）注音符号（闽南语、客家语扩展）：31A0-31BF */
    C_PhoneticNotation1: [[0x31a0, 0x31bf]],
    /**10）日文平假名：3040-309F */
    J_Hiragana: [[0x3040, 0x309f]],
    /**11）日文片假名：30A0-30FF */
    J_Katakana: [[0x30a0, 0x30ff]],
    /**12）日文片假名拼音扩展：31F0-31FF */
    J_Katakana1: [[0x31f0, 0x31ff]],

    /**13）韩文拼音：AC00-D7AF */
    K_Spell: [[0xac00, 0xd7af]],

    /**14）韩文字母：1100-11FF */
    K_Letter: [[0x1100, 0x11ff]],

    /**15）韩文兼容字母：3130-318F */
    K_Letter1: [[0x3130, 0x318f]],

    /**16）太玄经符号：1D300-1D35F */
    C_Symbol: [[0x1d300, 0x1d35f]],

    /**17）易经六十四卦象：4DC0-4DFF */
    C_Symbol1: [[0x4dc0, 0x4dff]],

    /**18）彝文音节：A000-A48F */
    C_Symbol2: [[0xa000, 0xa48f]],

    /**19）彝文部首：A490-A4CF */
    C_syllable: [[0xa490, 0xa4cf]],

    /**20）盲文符号：2800-28FF */
    Braille: [[0x2800, 0x28ff]],

    /**21）CJK字母及月份：3200-32FF */
    CJK_Symbol1: [[0x3200, 0x32ff]],

    /**22）CJK特殊符号（日期合并）：3300-33FF */
    CJK_Symbol2: [[0x3300, 0x33ff]],

    /**23）装饰符号（非CJK专用）：2700-27BF */
    DecorativeSymbol: [[0x2700, 0x27bf]],

    /**24）杂项符号（非CJK专用）：2600-26FF */
    Miscellaneous_Symbol: [[0x2600, 0x26ff]],

    /**25）中文竖排标点：FE10-FE1F */
    C_Punctuation: [[0xfe10, 0xfe1f]],

    /**26）CJK兼容符号（竖排变体、下划线、顿号）：FE30-FE4F */
    CJK_Symbol3: [[0xfe30, 0xfe4f]],
};

/** 字符区间判断 */
export const FontAreaAnalyze = (font: FontEditor.Font, meta: TTF.TTFObject) => {
    const recorded_char = new Set<number>();

    const area_map = Object.entries(CharAreas).map(([_, areas]) => {
        const name = _ as keyof typeof CharAreas;
        let support_count = 0;
        let area_count = 0;
        for (const area of areas) {
            const [min, max] = area;
            for (let index = min; index <= max; index++) {
                if (typeof meta.cmap[index.toString()] === "number") {
                    support_count++;
                    recorded_char.add(index);
                }

                area_count++;
            }
        }

        return {
            id: name as string,
            name: CharAreas_Translate[name],
            areas,
            support_count,
            area_count,
            coverage: (support_count / area_count).toFixed(2),
            // coverage:
        };
    });
    const unknown_char = Object.keys(meta.cmap)
        .map((i) => parseInt(i))
        .filter((i) => !recorded_char.has(i));
    console.log(String.fromCharCode(...unknown_char));
    area_map.push({
        id: "unknown_character",
        name: "未识别字符",
        areas: [],
        support_count: unknown_char.length,
        area_count: unknown_char.length,
        coverage: "1.0",
    });
    return {
        area_map,
    };
};
