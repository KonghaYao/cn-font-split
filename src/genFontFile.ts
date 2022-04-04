import path from "path";
import { nanoid } from "nanoid";
import { outputFile } from "fs-extra";
import { FontEditor } from "fonteditor-core";
import subsetFont from "subset-font";
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
    const font: Buffer = await subsetFont(Buffer.from(file), subset.join(), {
        targetFormat: "woff2",
    });

    const Path = path.join(destFold, id + ".woff2");

    await outputFile(Path, font);

    return { id, subset, size: font.length };
}
