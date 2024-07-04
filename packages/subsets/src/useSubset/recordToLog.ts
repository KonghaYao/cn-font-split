import { timeRecordFormat } from '../utils/timeCount';
import byteSize from 'byte-size';
import { IContext } from '../ createContext';

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
