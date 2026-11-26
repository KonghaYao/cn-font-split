/** @ts-ignore */
import { dlopen, FFIType, ptr, JSCallback, toArrayBuffer } from 'bun:ffi';
import { FontSplitProps } from '../interface.js';
import { resolveBinPath } from '../load.js';
import { isMusl } from '../node/isMusl.js';
import { createAPI } from '../createAPI.js';
export * from '../interface.js';
export * from '../createAPI.js';

const binPath = resolveBinPath({ isMusl });
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
