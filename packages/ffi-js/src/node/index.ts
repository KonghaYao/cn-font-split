import { FontSplitProps } from '../interface.js';
import { resolveBinPath } from '../load.js';
import { isMusl } from './isMusl.js';
export * from '../interface.js';
export * from '../createAPI.js';
// @ts-ignore
import { dlopen, Callback } from '@xan105/ffi/koffi';
import koffi from 'koffi';
import { createAPI } from '../createAPI.js';

const binPath = resolveBinPath({ isMusl });
const dylib = dlopen(binPath, {
    font_split: {
        parameters: ['pointer', 'usize', 'function'],
        result: 'void',
    },
});
const createCallback = (cb: (data: Uint8Array) => void) =>
    new Callback(
        {
            parameters: ['pointer', 'usize'],
            result: 'void',
        },
        (ptr: any, length: number) => {
            const data = koffi.decode(
                ptr,
                koffi.array('uint8_t', length, 'Array'),
            );
            cb(new Uint8Array(data));
        },
    ).pointer;

export const fontSplit = createAPI(dylib.font_split, createCallback);
