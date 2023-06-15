import { HB } from "../hb";
import { IOutputFile, SubsetResult } from "../interface";
import { FontType, convert } from "../font-converter";
import { IContext } from "../fontSplit/context";
import { getExtensionsByFontType } from "../utils/getExtensionsByFontType";
import { subsetFont } from "../subset";
import { createContoursMap } from "./createContoursMap";
import { calcContoursBorder } from "./calcContoursBorder";
import { createRecord } from "./createRecord";
import { recordToLog } from "./recordToLog";

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
        const outputMessage = await createRecord(
            outputFile,
            ext,
            transferred,
            Array.from(arr)
        );
        subsetMessage.push(outputMessage);
        recordToLog(
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
