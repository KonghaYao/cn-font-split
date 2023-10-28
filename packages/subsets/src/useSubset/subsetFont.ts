import { HB } from '../hb';
export interface SubsetFontOptions {
    variationAxes?: Record<string, number>;
    preserveNameIds?: number[];
    threads?:
        | false
        | {
              service?: null;
          };
}

/** 从总包中抽取出指定 subset 的字符区间，并返回最终结果的字符 */
export function subsetFont(
    face: HB.Face,
    subsetUnicode: (number | [number, number])[],
    hb: HB.Handle,
    { preserveNameIds, variationAxes }: SubsetFontOptions = {}
) {
    if (subsetUnicode.length === 0) {
        throw new Error(' 发现空分包');
    }
    const Subset = hb.createSubset(face, preserveNameIds, variationAxes);
    Subset.adjustLayout();
    Subset.addChars(subsetUnicode);
    // Subset.clearTableDrop();
    const facePtr = Subset.runSubset();
    const arr = hb.collectUnicodes(facePtr);

    let buffer: Uint8Array | null;
    if (arr.length) {
        const binarySubset = Subset.toBinary();
        buffer = binarySubset.data().slice();
        binarySubset.destroy();
    } else {
        buffer = null;
    }
    Subset.destroy();

    return [buffer, arr] as const;
}
