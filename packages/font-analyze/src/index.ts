import { Font, FontEditor, TTF } from "fonteditor-core";
import { Charset, FontSetMatch } from "./FontSetMatch";
import { UnicodeMatch } from "./UnicodeMatch";
const FontHeaders = (font: FontEditor.Font, meta: TTF.TTFObject) => {
    return meta.name;
};

export interface CharsetReporter {
    name: string;
    cn?: string;
    support_count: number;
    area_count: number;
    coverage: string;
    in_set_rate: string;
}

export const FontAnalyze = async (
    input: FontEditor.FontInput,
    type: FontEditor.FontType
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

    const { default: gb2312Set } = await import("../data/gb2312.json");
    const gb2312 = FontSetMatch(font, meta, gb2312Set as Charset, "GB2312");
    console.table(gb2312);

    const { default: Unicode } = await import("../data/unicodes.json");
    const unicodeReport = UnicodeMatch(font, meta, Unicode);
    // 太长了，不进行打印
    // console.table(areas, ["cn", "coverage", "support_count", "area_count"]);

    return { headers, unicode: unicodeReport, gb2312 };
};
