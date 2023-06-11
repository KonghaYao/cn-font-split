import { HB } from "./hb.js";
import { Buffer } from "buffer";
import { timeRecordFormat } from "./utils/timeCount.js";
import { IOutputFile, Subset, SubsetResult, Subsets } from "./interface.js";
import { FontType, convert } from "./font-converter.js";
import md5 from "md5";
import byteSize from "byte-size";
import { subsetToUnicodeRange } from "./utils/subsetToUnicodeRange.js";
import { IContext } from "./fontSplit/context.js";
import { getExtensionsByFontType } from "./utils/getExtensionsByFontType.js";

/** 可以实现较为准确的数值切割，但是计算时间可能会 x2, 非常差的一种算法 */
export const autoSubset = async (
    face: HB.Face,
    hb: HB.Handle,
    subsetUnicode: number[],
    outputFile: IOutputFile,
    targetType: FontType,
    ctx: IContext,
    maxSize = 70 * 1024
) => {
    const ext = getExtensionsByFontType(targetType);
    let startCount = 300;
    let sample = [...subsetUnicode];

    const tolerance = 0.1 * maxSize;
    let head!: number[];

    const subsetMessage: SubsetResult = [];
    let index = 0;
    while (sample.length) {
        const start = performance.now();
        head = sample.splice(0, startCount);
        // console.log("猜测切割 ", startCount);
        const Subset = hb.createSubset(face);
        Subset.adjustLayout();
        Subset.addChars(head);
        const facePtr = Subset.runSubset();
        const arr = hb.collectUnicodes(facePtr);

        let buffer: Uint8Array | null;
        if (arr.length) {
            const binarySubset = Subset.toBinary();
            buffer = binarySubset.data();
            const transferred = await convert(buffer, targetType);
            // 计算分包误差值
            const diff = transferred.byteLength - maxSize;
            if (Math.abs(diff) < tolerance) {
                // 允许通过
                const outputMessage = await combine(
                    outputFile,
                    ext,
                    transferred,
                    Array.from(arr)
                );
                subsetMessage.push(outputMessage);
                const end = performance.now();
                record(
                    ctx,
                    transferred,
                    start,
                    end,
                    arr,
                    index,
                    outputMessage.hash
                );
                index++;

                binarySubset.destroy();
            } else {
                // 猜测下一个分包数字
                const singleSize = transferred.byteLength / startCount;
                binarySubset.destroy();
                const changeCount = Math.floor(Math.abs(diff / singleSize));

                if (diff > 0) {
                    // 字符数分多了，退回 sample
                    startCount -= changeCount;
                    const diffChars = head.splice(
                        head.length - 1 - changeCount,
                        changeCount
                    );
                    sample.unshift(...diffChars);

                    Subset.deleteChar(diffChars);
                } else {
                    // 字符数分少了
                    startCount += changeCount;
                    const diffChars = sample.splice(0, changeCount);
                    Subset.addChars(diffChars);
                }
                const facePtr = Subset.runSubset();
                const arr = hb.collectUnicodes(facePtr);
                const { data } = Subset.toBinary();
                const binary = data();
                const transferred_ = await convert(binary, targetType);
                const outputMessage = await combine(
                    outputFile,
                    ext,

                    transferred_,
                    Array.from(arr)
                );
                subsetMessage.push(outputMessage);
                const end = performance.now();
                record(
                    ctx,
                    transferred_,
                    start,
                    end,
                    arr,
                    index,
                    outputMessage.hash,
                    true
                );
                index++;
            }
        } else {
            buffer = null;
        }
        Subset.destroy();
    }
    return subsetMessage;
};

async function combine(
    outputFile: IOutputFile,
    ext: string,
    transferred: Uint8Array,
    subset: Subset
) {
    const hashName = md5(transferred);
    await outputFile(hashName + ext, transferred);

    return {
        size: transferred.byteLength,
        hash: hashName,
        path: hashName + ext,
        unicodeRange: subsetToUnicodeRange(subset),
        subset,
    };
}

async function record(
    ctx: IContext,

    transferred: Uint8Array,
    start: number,
    end: number,
    unicodeInFont: Uint32Array,
    index: number,
    hash: string,
    isTwice = false
) {
    const finalChars = unicodeInFont.length;
    ctx.trace(
        [
            index,
            timeRecordFormat(start, end),
            (finalChars / (end - start)).toFixed(2) + "字符/ms",
            byteSize(transferred.byteLength) + "/" + finalChars,
            hash.slice(0, 7),
            isTwice,
        ].join(" \t")
    );
}
