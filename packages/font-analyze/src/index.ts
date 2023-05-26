import { Font, FontEditor, TTF } from "fonteditor-core";
import { FontAreaAnalyze } from "./FontAreaAnalyze";

const FontHeaders = (font: FontEditor.Font, meta: TTF.TTFObject) => {
    return meta.name;
};

export const FontAnalyze = (input: Buffer, type: FontEditor.FontType) => {
    const font = Font.create(input, {
        type, // support ttf, woff, woff2, eot, otf, svg
        hinting: true, // save font hinting
        compound2simple: false, // 这个选项可以避免下面的复合字符错误
        combinePath: false, // for svg path
    });
    const meta = font.get();

    const headers = FontHeaders(font, meta);
    console.table(headers);
    const areas = FontAreaAnalyze(font, meta);
    console.table(areas.area_map, [
        "name",
        "support_count",
        "area_count",
        "coverage",
    ]);
    return { headers, areas };
};
