import { Font } from "fonteditor-core";
import { Charset, FontSetMatch } from "./FontSetMatch";
import { UnicodeCharset, UnicodeMatch } from "./UnicodeMatch";
import { FontHeaders } from "./FontHeaders";
export interface CharsetReporter {
    name: string;
    cn?: string;
    start?: string;
    end?: string;
    support_count: number;
    area_count: number;
    coverage: string;
    in_set_rate: string;
}
export type CharsetLoader = (path: string) => Promise<Charset | UnicodeCharset>;

const defaultCharsetLoader: CharsetLoader = async (path) => {
    const { default: D } = await import("../data/" + path);
    return D;
};
/** 分析字体中的 */
export const FontAnalyze = async (
    input: Buffer | ArrayBuffer,
    type: "ttf" | "otf" | "woff2",
    charsetLoader: CharsetLoader = defaultCharsetLoader
) => {
    const font = Font.create(input, {
        type, // support ttf, woff, woff2, eot, otf, svg
        hinting: true, // save font hinting
        compound2simple: false, // 这个选项可以避免下面的复合字符错误
        combinePath: false, // for svg path
    });
    const meta = font.get();

    const headers = FontHeaders(font, meta);
    console.table(headers);

    // 软件需要在浏览器运行，所以按需加载比较合适

    const standard = await Promise.all(
        [
            ["gb2312.json", "GB/T 2312"],
            ["changyong-3500.json", "现代汉语常用字表"],
            ["tongyong-7000.json", "现代汉语通用字表"],
            ["yiwu-jiaoyu.json", "义务教育语文课程常用字表"],
            ["tongyong-guifan.json", "通用规范汉字表"],
            ["hanyi-jianfan.json", "汉仪简繁字表"],
            ["fangzheng-jianfan.json", "方正简繁字表"],
            ["iicore.json", "国际表意文字核心（IICore）"],
            ["gbk.json", "GBK"],

            ["changyong4808.json", "常用国字标准字体表"],
            ["cichangyong-6343.json", "次常用国字标准字体表"],
            ["big5-changyong.json", "Big5 常用汉字表"],
            ["big5.json", "Big5"],
            ["hk-changyong.json", "常用字字形表（香港）"],
            ["hk-hkscs.json", "香港增补字符集"],
            ["hk-suppchara.json", "常用香港外字表"],
        ].map(async ([_path, name]) => {
            const set = await charsetLoader(_path);
            return FontSetMatch(font, meta, set as Charset, name);
        })
    );
    // console.table(standard);

    const Unicode = await charsetLoader("unicodes.json");
    const unicodeReport = UnicodeMatch(font, meta, Unicode as UnicodeCharset);
    // 太长了，不进行打印
    // console.table(areas, ["cn", "coverage", "support_count", "area_count"]);

    return {
        file: {
            size: input.byteLength,
            char_count: Object.keys(meta.cmap).length,
        },
        /** 字体头部信息 */
        headers,
        /** unicode 字符集合检测 */
        unicode: unicodeReport,
        /** 各大标准字符集检测 */
        standard,
    };
};
