import { HB } from "../hb";
import { ISubsetFont, SubsetFontOptions } from "./index";

export const subsetFont: ISubsetFont = async (...args) => {
    if (args[3].threads) {
        return args[3].threads.service!.subsetFont(...args);
    } else {
        return subsetFontSimple(...args);
    }
};
/** 从总包中抽取出指定 subset 的字符区间，并返回最终结果的字符 */
export function subsetFontSimple(
    face: HB.Face,
    subsetUnicode: (number | [number, number])[],
    hb: HB.Handle,
    { preserveNameIds, variationAxes }: SubsetFontOptions = {}
) {
    const Subset = hb.createSubset(face, preserveNameIds, variationAxes);
    Subset.adjustLayout();

    Subset.addChars(subsetUnicode);
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
