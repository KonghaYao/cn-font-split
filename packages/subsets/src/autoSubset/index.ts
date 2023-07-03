import { HB } from "../hb";
import {
    IOutputFile,
    InputTemplate,
    SubsetResult,
} from "../interface";
import { convert } from "../convert/font-converter";
import type { FontType } from "../detectFormat";
import { IContext } from "../fontSplit/context";
import { getExtensionsByFontType } from "../utils/getExtensionsByFontType";
import { subsetFont } from "../subsetService/subsetFont";
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
    const { input } = ctx.pick("input");
    const ext = getExtensionsByFontType(targetType);
    const subsetMessage: SubsetResult = [];
    const sample = subsetUnicode;

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
        // contoursMap 0 是平均值
        count += contoursMap.get(unicode) ?? contoursMap.get(0) as number;
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
        await Promise.all(
            totalChunk.map(async (chunk, index) =>
                runSubSet(
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
                )
            )
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
    const [buffer, arr] = subsetFont(face, chunk, hb, {});
    const middle = performance.now();
    if (!buffer) return;
    const service = input.threads?.service;
    const transferred = service
        ? await service.pool.exec("convert", [buffer, targetType], {
            transfer: [buffer.buffer],
        })
        : await convert(buffer, targetType);
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
