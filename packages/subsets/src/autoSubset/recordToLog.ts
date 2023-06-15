import { timeRecordFormat } from "../utils/timeCount";
import byteSize from "byte-size";
import { IContext } from "../fontSplit/context";

export async function recordToLog(
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
