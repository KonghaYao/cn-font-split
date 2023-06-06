import { hbjs } from "./hb.js";
import { Buffer } from "buffer";
import { IOutputFile } from "./main.js";
import { FontType, convert } from "./font-converter.js";
import { md5 } from "hash-wasm";

export interface Options {
    variationAxes?: Record<number, number>;
    preserveNameIds?: number[];
}
export const Extensions = {
    otf: "otf",
    ttf: "ttf",
    sfnt: "otf",
    truetype: "ttf",
    woff: "woff",
    woff2: "woff2",
} as const;
export const subsetAll = async (
    TTFBuffer: Uint8Array,
    hb: ReturnType<typeof hbjs>,
    /**
     * @example
     * [
     *   [1,2,3,4],  // single package
     *   [ [5,10] ]   //unicode 5-10 to a single package
     * ]
     *
     */
    subsets: (number | [number, number])[][],
    outputFile: IOutputFile,
    targetType: FontType
) => {
    const blob = hb.createBlob(TTFBuffer);

    const face = hb.createFace(blob, 0);
    blob.destroy();
    const ext = Extensions[targetType];

    await Promise.all(
        subsets.map(async (subset) => {
            const buffer = subsetFont(face, subset, hb);
            const transferred = await convert(buffer, targetType);
            const hashName = await md5(transferred);
            outputFile(hashName + "." + ext, transferred);
        })
    );

    face.destroy();
    blob.free();
};

export function subsetFont(
    face: ReturnType<ReturnType<typeof hbjs>["createFace"]>,
    subsetUnicode: (number | [number, number])[],
    hb: ReturnType<typeof hbjs>,
    { preserveNameIds, variationAxes }: Options = {}
) {
    const Subset = hb.createSubset(face, preserveNameIds, variationAxes);
    Subset.adjustLayout();

    Subset.addChars(subsetUnicode);
    Subset.runSubset();

    const binarySubset = Subset.toArray();
    const buffer = Buffer.from(binarySubset.data);
    binarySubset.destroy();
    Subset.destroy();

    return buffer;
}
