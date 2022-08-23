import { Font, FontEditor, TTF, woff2 } from "fonteditor-core";
export async function initWoff2() {
    await woff2.init("../../node_modules/fonteditor-core/woff2/woff2.wasm");
}
export function ReadFontDetail(
    file: FontEditor.FontInput,
    inputType: FontEditor.FontType = "ttf"
) {
    console.time("获取font");
    const font = Font.create(file, {
        type: inputType,
        subset: [],
        hinting: true,
        compound2simple: true,
    });

    console.timeEnd("获取font");

    // 注意 font.data === data
    const data = font.get();

    return { font, data };
}
export function ReadFontUnicode(
    file: FontEditor.FontInput,
    inputType: FontEditor.FontType = "ttf"
) {
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
    file: FontEditor.Font,
    subset: number[],
    targetType: FontEditor.FontType = "woff2"
) {
    const g = file.find({ unicode: subset });
    const newFont = file.readEmpty();
    const data = Object.assign(
        Object.fromEntries(Object.entries(newFont.get()))
    ) as TTF.TTFObject;
    newFont.set(data);

    return newFont.write({
        type: targetType,
        hinting: true,
    });
}
