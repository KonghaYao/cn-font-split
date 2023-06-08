import { HB, hbjs } from "./hb.js";
import { Buffer } from "buffer";
import { timeRecordFormat } from "./utils/timeCount.js";
import { IOutputFile, SubsetResult } from "./interface.js";
import { FontType, convert } from "./font-converter.js";
import md5 from "md5";
import { Logger } from "tslog";
import byteSize from "byte-size";
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

export const subsetToUnicodeRange = (subset: (number | [number, number])[]) => {
    return subset
        .reduce((col, cur) => {
            if (typeof cur === "number") {
                col.push("U+" + cur.toString(16));
            } else {
                col.push(`U+${cur[0].toString(16)}-${cur[1].toString(16)}`);
            }
            return col;
        }, [] as string[])
        .join(",");
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
        const buffer = subsetFont(face, subset, hb);
        const middle = performance.now();
        const transferred = await convert(buffer, targetType);
        const end = performance.now();
        const count = countSubsetChars(subset);
        log.trace(
            [
                index,
                timeRecordFormat(start, middle),
                (count / (middle - start)).toFixed(2) + "字符/ms",
                timeRecordFormat(middle, end),
                (count / (end - middle)).toFixed(2) + "字符/ms",
                byteSize(buffer.byteLength) + "/" + count,
            ].join(" \t")
        );
        const hashName = md5(transferred);
        // 不进行 promise 限制
        outputFile(hashName + ext, transferred);
        subsetMessage.push({
            hash: hashName,
            path: hashName + ext,
            unicodeRange: subsetToUnicodeRange(subset),
        });
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
    Subset.runSubset();

    const binarySubset = Subset.toArray();
    const buffer = Buffer.from(binarySubset.data);
    binarySubset.destroy();
    Subset.destroy();

    return buffer;
}
