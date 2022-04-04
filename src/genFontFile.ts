import path from "path";
import { nanoid } from "nanoid";
import { outputFile } from "fs-extra";
import { Font, FontEditor } from "fonteditor-core";
export type ResultDetail = {
    id: string;
    subset: string[];
    size: number;
};
/** 制作字体文件 */
export async function genFontFile(
    file: ArrayBuffer,
    subset: string[],
    destFold: string,
    inputType: FontEditor.FontType = "ttf"
) {
    const id = nanoid();
    let font: Buffer = await genFont(file, subset);

    const Path = path.join(destFold, id + ".woff2");

    await outputFile(Path, font);

    return { id, subset, size: font.length };
}

/** 使用 fontcore 进行转化
 */
import codePoint from "code-point";
import { initWoff2 } from "./utils/FontUtils";
async function genFont(file: ArrayBuffer, subset: string[]): Promise<Buffer> {
    file.byteLength;
    const font = Font.create(file, {
        type: "ttf",
        subset: subset.map((i) => codePoint(i)),
        hinting: true,
        compound2simple: true,
    });
    await initWoff2();

    return font.write({
        type: "woff2",
    }) as Buffer;
}
