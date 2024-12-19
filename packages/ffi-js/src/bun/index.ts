/** @ts-ignore */
import { dlopen, FFIType, ptr, JSCallback, toArrayBuffer } from 'bun:ffi';
import path from 'path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { isMusl } from '../node/isMusl.js';
import { createAPI } from '../createAPI.js';
export * from '../interface.js';

let binPath = process.env.CN_FONT_SPLIT_BIN;
if (!binPath) {
    binPath = path.resolve(
        __dirname,
        '../' +
            getBinName(matchPlatform(process.platform, process.arch, isMusl)),
    );
    // console.log(binPath);
    // throw new Error('CN_FONT_SPLIT_BIN is undefined!');
}
const {
    symbols: { font_split },
    close,
} = dlopen(binPath, {
    font_split: {
        args: [FFIType.ptr, FFIType.usize, FFIType.callback],
        returns: FFIType.void,
    },
});
const createCallback = (cb: (data: Uint8Array) => void) =>
    new JSCallback(
        (ptr: any, length: BigInt) => {
            const data = new Uint8Array(
                toArrayBuffer(ptr, 0, Number(length)).slice(),
                0,
                Number(length),
            );
            cb(data);
        },
        {
            returns: FFIType.void,
            args: [FFIType.ptr, FFIType.usize],
        },
    ).ptr;
export const fontSplit = createAPI((buffer, length, cb) => {
    return font_split(ptr(buffer), length, cb);
}, createCallback);
