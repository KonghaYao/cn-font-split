import { Font, woff2 } from "fonteditor-core";

export function ReadFontDetail(file) {
    const font = Font.create(file, {
        type: "ttf",
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    const fontObj = font.get();

    return fontObj.name;
}
export function ReadFontUnicode(file) {
    const font = Font.create(file, {
        type: "ttf",
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    const fontObj = font.get();
    const result = Object.keys(fontObj.cmap);
    console.log(" - 总共找到 " + result.length + " 个字符");
    return result.map((i) => parseInt(i));
}
// 裁切一个 woff2 文件出来
// file: Buffer
// subset: unicode Number Array
// chunkSize: How many fonts every chunk contain
export async function CutFont(file, subset, index) {
    const font = Font.create(file, {
        type: "ttf",
        subset,
        hinting: true,
        compound2simple: true,
    });
    // font.optimize();

    await woff2.init();
    console.log("分包情况: ", index, " | 分字符集大小 | ", subset.length);
    return font.write({
        type: "woff2",
        hinting: true,
    });
}
