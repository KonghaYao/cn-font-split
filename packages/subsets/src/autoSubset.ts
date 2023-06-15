import { HB } from "./hb";
import { timeRecordFormat } from "./utils/timeCount";
import { IOutputFile, Subset, SubsetResult } from "./interface";
import { FontType, convert } from "./font-converter";
import md5 from "md5";
import byteSize from "byte-size";
import { subsetToUnicodeRange } from "./utils/subsetToUnicodeRange";
import { IContext } from "./fontSplit/context";
import { getExtensionsByFontType } from "./utils/getExtensionsByFontType";
import { subsetFont } from "./subset";
import { loadData } from "./adapter/loadData";
import { cacheResult } from "./utils/cacheResult";

/** 构建轮廓数据库，存储方式为桶存储 */
const createContoursMap = cacheResult(async () => {
    const buffer = await loadData(
        "node_modules/@chinese-fonts/font-contours/data/unicodes_contours.dat"
    );
    const a = new Uint8Array(buffer.buffer);
    const map = new Map<number, number>();
    let wasted = 0;
    for (let index = 0; index < a.length; index++) {
        const element = a[index];
        element !== 0 ? map.set(index, element) : wasted++;
    }
    return map;
});

/** 可以实现较为准确的数值切割，偏差大致在 10 kb 左右 */
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
    const subsetMessage: SubsetResult = [];
    let sample = subsetUnicode;

    const contoursMap = await createContoursMap();

    // 采样估值法，计算单个分包包含 contours 数目
    const contoursBorder = await calcContoursBorder(
        hb,
        face,
        targetType,
        contoursMap,
        maxSize
    );

    ctx.trace("开始分包");
    let count = 0;
    let cache: number[] = [];
    const totalChunk: number[][] = [];
    for (const unicode of sample) {
        count += contoursMap.get(unicode) ?? contoursMap.get(0)!;
        cache.push(unicode);
        if (count >= contoursBorder) {
            totalChunk.push(cache);
            cache = [];
            count = 0;
        }
    }
    totalChunk.push(cache);
    // console.log(totalChunk.flat().length);

    let index = 0;
    for (const chunk of totalChunk) {
        const start = performance.now();
        const [buffer, arr] = subsetFont(face, chunk, hb);
        const middle = performance.now();
        const transferred = await convert(
            new Uint8Array(buffer!.buffer),
            targetType
        );
        const end = performance.now();
        const outputMessage = await combine(
            outputFile,
            ext,
            transferred,
            Array.from(arr)
        );
        subsetMessage.push(outputMessage);
        record(
            ctx,
            transferred,
            start,
            middle,
            end,
            arr,
            index,
            outputMessage.hash
        );
        index++;
    }
    ctx.trace("结束分包");
    return subsetMessage;
};

/** 计算分包时，单个包内可以容纳的最大轮廓 */
async function calcContoursBorder(
    hb: HB.Handle,
    face: HB.Face,
    targetType: FontType,
    contoursMap: Map<number, number>,
    maxSize: number
) {
    const sample = face.collectUnicodes();
    const space = Math.floor(sample.length / 300);
    let sampleUnicode: number[] = [];
    for (let index = 0; index < sample.length; index += space) {
        const element = sample[index];
        sampleUnicode.push(element);
    }
    // console.log(sampleUnicode.length);
    const [buffer, arr] = subsetFont(face, sampleUnicode, hb);
    const transferred = await convert(
        new Uint8Array(buffer!.buffer),
        targetType
    );

    const totalContours: number = arr.reduce((col, cur) => {
        return col + (contoursMap.get(cur) ?? contoursMap.get(0)!);
    }, 0);
    const ContoursPerByte = totalContours / transferred.byteLength;
    return maxSize * ContoursPerByte;
}

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
    middle: number,
    end: number,
    unicodeInFont: Uint32Array,
    index: number,
    hash: string,
    isTwice = false
) {
    const arr = unicodeInFont;
    ctx.trace(
        [
            index,
            timeRecordFormat(start, middle),
            (arr.length / (middle - start)).toFixed(2) + "字符/ms",
            timeRecordFormat(middle, end),
            (arr.length / (end - middle)).toFixed(2) + "字符/ms",
            byteSize(transferred.byteLength) + "/" + arr.length,
            hash.slice(0, 7),
            isTwice,
        ].join(" \t")
    );
}
