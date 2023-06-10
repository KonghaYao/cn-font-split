import { HB } from "./hb.js";
import { Buffer } from "buffer";
import { timeRecordFormat } from "./utils/timeCount.js";
import { IOutputFile, SubsetResult, Subsets } from "./interface.js";
import { FontType, convert } from "./font-converter.js";
import md5 from "md5";
import byteSize from "byte-size";
import { subsetToUnicodeRange } from "./utils/subsetToUnicodeRange.js";
import { IContext } from "./fontSplit/context.js";

/** 可以实现较为准确的数值切割，但是计算时间可能会 x2 */
export const autoSubset = (
    face: HB.Face,
    subsetUnicode: number[],
    hb: HB.Handle,
    maxSize = 70 * 1024
) => {
    let startCount = 300;
    let sample = [...subsetUnicode];

    const tolerance = 0.1 * maxSize;
    let head!: number[];

    const subsets: { binary: Uint8Array; subset: Uint32Array }[] = [];

    while (sample.length) {
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

            // 计算分包误差值
            const diff = binarySubset.subsetByteLength - maxSize;
            if (Math.abs(diff) < tolerance) {
                buffer = binarySubset.data();
                subsets.push({ binary: buffer, subset: arr });
                console.log("bc count ", arr.length, buffer.byteLength);
                binarySubset.destroy();
            } else {
                // 猜测下一个分包数字
                const singleSize = binarySubset.subsetByteLength / startCount;
                binarySubset.destroy();
                const changeCount = Math.floor(Math.abs(diff / singleSize));
                console.log(diff, changeCount);
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
                subsets.push({ binary, subset: arr });
            }
        } else {
            buffer = null;
        }
        Subset.destroy();
    }
    return subsets;
};
