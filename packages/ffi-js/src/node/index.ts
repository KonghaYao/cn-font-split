import path from 'path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { isMusl } from './isMusl.js';
export * from '../interface.js';
export * from '../createAPI.js';
// @ts-ignore
import { dlopen, Callback } from '@xan105/ffi/koffi';
import koffi from 'koffi';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createAPI } from '../createAPI.js';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);

let binPath = process.env.CN_FONT_SPLIT_BIN;
if (!binPath) {
    binPath = path.resolve(
        __dirname,
        '../' +
            getBinName(matchPlatform(process.platform, process.arch, isMusl)),
    );
    // throw new Error('CN_FONT_SPLIT_BIN is undefined!');
}
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
