import { hbjs } from "./hb.js";
import { Buffer } from "buffer";

export interface Options {
    variationAxes?: Record<number, number>;
    preserveNameIds?: number[];
}

export const subsetAll = (
    TTFBuffer: Buffer,
    hb: ReturnType<typeof hbjs>,
    /**
     * @example
     * [
     *   [1,2,3,4],  // single package
     *   [ [5,10] ]   //unicode 5-10 to a single package
     * ]
     *
     */
    subsets: (number | [number, number])[][]
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
