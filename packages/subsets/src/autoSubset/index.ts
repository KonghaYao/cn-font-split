import { BufferFlag, HB } from "../hb";
import {
    IOutputFile,
    InputTemplate,
    SubsetResult,
    Subsets,
} from "../interface";
import { convert } from "../font-converter";
import type { FontType } from "../detectFormat";
import { IContext } from "../fontSplit/context";
import { getExtensionsByFontType } from "../utils/getExtensionsByFontType";
import { subsetFont } from "../subsetService/subsetFont";
import { createContoursMap } from "./createContoursMap";
import { calcContoursBorder } from "./calcContoursBorder";
import { createRecord } from "./createRecord";
import { recordToLog } from "./recordToLog";
import { Context } from "src/pipeline";

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
    const { input } = ctx.pick("input");
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

    if (input.threads) {
        console.log("并行");
        await Promise.all(
            totalChunk.map(async (chunk, index) => {
                await runSubSet(
                    face,
                    chunk,
                    hb,
                    input,
                    targetType,
                    outputFile,
                    ext,
                    subsetMessage,
                    ctx,
                    index
                );
            })
        );
    } else {
        let index = 0;
        for (const chunk of totalChunk) {
            await runSubSet(
                face,
                chunk,
                hb,
                input,
                targetType,
                outputFile,
                ext,
                subsetMessage,
                ctx,
                index
            );
            index++;
        }
    }
    ctx.trace("结束分包");
    return subsetMessage;
};
async function runSubSet(
    face: HB.Face,
    chunk: number[],
    hb: HB.Handle,
    input: InputTemplate,
    targetType: FontType,
    outputFile: IOutputFile,
    ext: string,
    subsetMessage: SubsetResult,
    ctx: IContext,
    index: number
) {
    const start = performance.now();
    const [buffer, arr] = await subsetFont(face, chunk, hb, {
        threads: input.threads,
    });
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
}
