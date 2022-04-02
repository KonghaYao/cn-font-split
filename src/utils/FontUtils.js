import { Font, woff2 } from "fonteditor-core";

export function ReadFontDetail(file, inputType = "ttf") {
    const font = Font.create(file, {
        type: inputType,
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    font.get();

    return font;
}
export function ReadFontUnicode(file, inputType = "ttf") {
    const font = Font.create(file, {
        type: inputType,
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
export async function CutFont(
    file,
    subset,
    inputType = "ttf",
    targetType = "woff2"
) {
    const font = Font.create(file, {
        type: inputType,
        subset,
        hinting: true,
        compound2simple: true,
    });
    // font.optimize();
    if (targetType === "woff2") await woff2.init();
    return font.write({
        type: targetType,
        hinting: true,
    });
}
