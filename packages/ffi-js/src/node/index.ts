import path from 'path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { isMusl } from './isMusl.js';
export * from '../interface.js';
import ffi from '@2060.io/ffi-napi';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createAPI } from '../createAPI.js';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);
function createCallback(cb: (res: Uint8Array) => void): any {
    const func = (ptr: any, size: number) => {
        const buf = ptr.reinterpret(size, 0);
        cb(new Uint8Array(buf));
    };
    return ffi.Callback('void', ['pointer', 'size_t'], func);
}

let binPath = process.env.CN_FONT_SPLIT_BIN;
if (!binPath) {
    binPath = path.resolve(
        __dirname,
        '../' +
            getBinName(matchPlatform(process.platform, process.arch, isMusl)),
    );
    // throw new Error('CN_FONT_SPLIT_BIN is undefined!');
}
const lib = ffi.Library(binPath, {
    font_split: ['void', ['pointer', 'size_t', 'pointer']],
});
export const fontSplit = createAPI(lib.font_split as any, createCallback);
