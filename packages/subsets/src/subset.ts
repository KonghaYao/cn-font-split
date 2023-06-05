import { hbjs } from "./hb.js";
import { Buffer } from "buffer";

function HB_TAG(str: string) {
    return str.split("").reduce(function (a, ch) {
        return (a << 8) + ch.charCodeAt(0);
    }, 0);
}

export interface Options {
    variationAxes?: string;
    preserveNameIds?: string;
}

export async function subsetFont(
    /** 注意，buffer 必须为 TTF，你可以使用 converter 转换 */
    TTFBuffer: Buffer,
    text: string,
    hb: ReturnType<typeof hbjs>,
    { preserveNameIds, variationAxes }: Options = {}
) {
    if (typeof text !== "string") {
        throw new Error("The subset text must be given as a string");
    }

    const blob = hb.createBlob(TTFBuffer);

    const face = hb.createFace(blob, 0);
    blob.destroy();

    const Subset = hb.createSubset(face, preserveNameIds, variationAxes);
    Subset.adjustLayout();

    Subset.addChars(text.split("").map((i) => i.codePointAt(0)!));
    Subset.runSubset();
    const binarySubset = Subset.toArray();
    const buffer = Buffer.from(binarySubset.data);
    binarySubset.destroy();
    face.destroy();
    blob.free();
    return buffer;
}
