import { HB } from '../hb';
import { IOutputFile, InputTemplate, SubsetResult } from '../interface';
import { convert } from '../convert/font-convert';
import type { FontType } from '../convert/detectFormat';
import { IContext } from '../ createContext';
import { getExtensionsByFontType } from '../convert/detectFormat';
import { subsetFont } from './subsetFont';
import { createRecord, getFileHashName } from '../logger/createRecord';
import { recordToLog } from '../logger/recordToLog';

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

    const createContext = (chunk: number[], index: number) => {
        return {
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
        };
    };
    if (input.threads) {
        await Promise.all(
            totalChunk.map(async (chunk, index) =>
                runSubSet(createContext(chunk, index)).catch((e: Error) => {
                    ctx.warn('分包失败 ' + index + ' ' + e.message);
                }),
            ),
        );
    } else {
        let index = 0;
        for (const chunk of totalChunk) {
            await runSubSet(createContext(chunk, index));
            index++;
        }
    }
    ctx.trace('结束分包');
    return subsetMessage;
};
/**  使用 harfbuzz 开始进行分包 */
async function runSubSet({
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
}: {
    face: HB.Face;
    chunk: number[];
    hb: HB.Handle;
    input: InputTemplate;
    targetType: FontType;
    outputFile: IOutputFile;
    ext: string;
    subsetMessage: SubsetResult;
    ctx: IContext;
    index: number;
}) {
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
    // 先计算filename，避免 buffer 数据后面清空
    const filename = getFileHashName(input, buffer, ext, index);

    // 执行 ttf 文件转 woff2
    const woff2Start = performance.now();
    const service = input.threads && input.threads?.service;
    const transferred = service
        ? await service.pool.exec(
              'convert',
              [buffer, targetType, undefined, input.buildMode],
              {
                  transfer: [buffer.buffer],
              },
          )
        : await convert(buffer, targetType, undefined, input.buildMode);
    const woff2Time = [woff2Start, performance.now()] as const;
    const outputMessage = await createRecord(
        outputFile,
        transferred,
        chunk, // 理论分包
        Array.from(arr), // 实际分包
        // 采用 ttf 文件的二进制进行操作，保证 hash 统一
        filename,
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
