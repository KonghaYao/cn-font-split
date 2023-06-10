import { HB, hbjs } from "./hb.js";
import { Buffer } from "buffer";
import { timeRecordFormat } from "./utils/timeCount.js";
import { IOutputFile, SubsetResult } from "./interface.js";
import { FontType, convert } from "./font-converter.js";
import md5 from "md5";
import { Logger } from "tslog";
import byteSize from "byte-size";
import { subsetToUnicodeRange } from "./utils/subsetToUnicodeRange.js";
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

export const countSubsetChars = (subset: (number | [number, number])[]) => {
    return subset.reduce((col: number, cur) => {
        col += 1;
        return typeof cur === "number" ? col : col + (cur[1] - cur[0]);
    }, 0);
};

export const subsetAll = async (
    face: HB.Face,
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
    targetType: FontType,
    log: Logger<unknown>
): Promise<SubsetResult> => {
    const ext = "." + Extensions[targetType];

    const subsetMessage: SubsetResult = [];
    log.trace("id \t分包时间及速度 \t转换时间及速度\t分包最终情况");
    for (let index = 0; index < subsets.length; index++) {
        const subset = subsets[index];
        const start = performance.now();
        const [buffer, arr] = subsetFont(face, subset, hb);
        const middle = performance.now();

        // const transferred = buffer
        if (buffer) {
            const transferred = await convert(buffer, targetType);
            const end = performance.now();
            const count = countSubsetChars(subset);
            log.trace(
                [
                    index,
                    timeRecordFormat(start, middle),
                    (arr.length / (middle - start)).toFixed(2) + "字符/ms",
                    timeRecordFormat(middle, end),
                    (arr.length / (end - middle)).toFixed(2) + "字符/ms",
                    byteSize(transferred.byteLength) + "/" + count,
                ].join(" \t")
            );
            const hashName = md5(transferred);
            await outputFile(hashName + ext, transferred);
            subsetMessage.push({
                hash: hashName,
                path: hashName + ext,
                size: transferred.byteLength,
                unicodeRange: subsetToUnicodeRange(subset),
            });
        } else {
            log.warn([index, "未发现字符", "取消分包"].join("\t"));
        }
    }

    return subsetMessage;
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
    const facePtr = Subset.runSubset();
    const arr = hb.collectUnicodes(facePtr);

    let buffer: Buffer | null;
    if (arr.length) {
        const binarySubset = Subset.toArray();
        buffer = Buffer.from(binarySubset.data);
        binarySubset.destroy();
    } else {
        buffer = null;
    }
    Subset.destroy();

    return [buffer, arr] as const;
}
