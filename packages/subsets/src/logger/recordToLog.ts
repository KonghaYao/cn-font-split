import byteSize from 'byte-size';
import { IContext } from '../createContext';

const timeRecordFormat = (start: number, end: number) => {
    return (end - start).toFixed(0) + 'ms';
};

/** 记录到日志里面，用于 cli 中展示 */
export async function recordToLog(
    ctx: IContext,
    transferred: Uint8Array,
    hbTime: readonly [number, number],
    woff2Time: readonly [number, number],
    unicodeInFont: Uint32Array,
    index: number,
    filename: string,
) {
    const arr = unicodeInFont;
    ctx.trace(
        [
            index,
            timeRecordFormat(...hbTime),
            timeRecordFormat(...woff2Time),
            byteSize(transferred.byteLength) + '/' + arr.length,
            filename.slice(0, 7),
        ].join(' \t'),
    );
}
