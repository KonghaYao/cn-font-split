import { HB } from '../hb';
import { IOutputFile, InputTemplate, SubsetResult } from '../interface';
import { convert } from '../convert/font-converter';
import type { FontType } from '../utils/detectFormat';
import { IContext } from '../fontSplit/context';
import { getExtensionsByFontType } from '../utils/getExtensionsByFontType';
import { subsetFont } from './subsetFont';
import { createRecord } from './createRecord';
import { recordToLog } from './recordToLog';

/** 直接根据chunk 批量分包字体 */
export const useSubset = async (
    face: HB.Face,
    hb: HB.Handle,
    totalChunk: number[][],
    outputFile: IOutputFile,
    targetType: FontType,
    ctx: IContext,
) => {
    const { input } = ctx.pick('input');
    const ext = getExtensionsByFontType(targetType);
    const subsetMessage: SubsetResult = [];

    ctx.trace('开始分包 分包数', totalChunk.length);
    ctx.trace('序号\thb\twoff2\t大小/字符\t名称');

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
                    index,
                ).catch((e: Error) => {
                    ctx.warn('分包失败 ' + index + ' ' + e.message);
                }),
            ),
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
                index,
            );
            index++;
        }
    }
    ctx.trace('结束分包');
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
    index: number,
) {
    const hbStart = performance.now();
    if (chunk.length === 0) {
        ctx.warn('发现空分包' + chunk);
        return;
    }
    const [buffer, arr] = subsetFont(face, chunk, hb, {});
    const hbTime = [hbStart, performance.now()] as const;
    if (!buffer || buffer.byteLength === 0) {
        ctx.warn('发现空分包' + chunk);
        return;
    }

    // 执行 ttf 文件转 woff2
    const woff2Start = performance.now();
    const service = input.threads && input.threads?.service;
    const transferred = service
        ? await service.pool.exec('convert', [buffer, targetType], {
              transfer: [buffer.buffer],
          })
        : await convert(buffer, targetType);
    const woff2Time = [woff2Start, performance.now()] as const;

    const outputMessage = await createRecord(
        outputFile,
        ext,
        transferred,
        chunk, // 理论分包
        Array.from(arr), // 实际分包
        input,
        index,
    );
    // console.log(chunk.length - arr.length) // 记录理论分包和实际分包的数目差距
    subsetMessage.push(outputMessage);
    recordToLog(
        ctx,
        transferred,
        hbTime,
        woff2Time,
        arr,
        index,
        outputMessage.path,
    );
}
import {
    FeatureMap,
    processSingleUnicodeWithFeature,
} from '../subsetService/featureMap';
/** 获取自动分包方案 */
export const getAutoSubset = (
    subsetUnicode: number[],
    contoursBorder: number,
    contoursMap: Map<number, number>,
    featureMap: FeatureMap,
    maxCharSize: number,
) => {
    let count = 0;
    let cache: number[] = [];
    const totalChunk: number[][] = [];

    const defaultVal = contoursMap.get(0) as number;
    for (const unicode of subsetUnicode) {
        // featureMap 已经进行了去重
        const unicodeSet = processSingleUnicodeWithFeature(unicode, featureMap);

        const sum = unicodeSet.reduce(
            (col, cur) => col + (contoursMap.get(cur) ?? defaultVal),
            0,
        );
        // contoursMap 0 是平均值
        count += sum;
        cache.push(...unicodeSet);

        if (count >= contoursBorder || cache.length >= maxCharSize) {
            totalChunk.push(cache);
            cache = [];
            count = 0;
        }
    }
    if (cache.length) totalChunk.push(cache);

    // console.log(totalChunk.flat().length);
    return totalChunk;
};
