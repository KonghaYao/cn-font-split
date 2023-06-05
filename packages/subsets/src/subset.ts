import { hbjs } from "./hb.js";
import { Buffer } from "buffer";

export interface Options {
    variationAxes?: Record<number, number>;
    preserveNameIds?: number[];
}

export const fontSplit = (
    TTFBuffer: Buffer,
    hb: ReturnType<typeof hbjs>,
    subsets: number[][]
) => {
    const blob = hb.createBlob(TTFBuffer);

    const face = hb.createFace(blob, 0);
    blob.destroy();
    subsets.forEach((subset) => {
        const buffer = subsetFont(face, subset, hb);
    });

    face.destroy();
    blob.free();
};

export function subsetFont(
    face: ReturnType<ReturnType<typeof hbjs>["createFace"]>,
    subsetUnicode: number[],
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
