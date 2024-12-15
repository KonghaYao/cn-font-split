import { api_interface } from '../gen/index.js';
import fs from 'fs-extra';
import path from 'path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { isMusl } from './isMusl.js';
export * from '../interface.js';
import ffi from 'ffi-napi';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);
export function createCallback(cb: (res: Uint8Array) => void) {
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
export async function fontSplit(data: FontSplitProps) {
    const input = api_interface.InputTemplate.fromObject(data);
    if (!input.out_dir) throw new Error('cn-font-split need out_dir');
    return new Promise<void>((res) => {
        const buf = input.serialize();
        lib.font_split(
            buf as any,
            buf.length,
            createCallback((data) => {
                let e = api_interface.EventMessage.deserialize(data);
                switch (e.event) {
                    case api_interface.EventName.END:
                        res();
                        break;
                    case api_interface.EventName.OUTPUT_DATA:
                        console.log(e.message);
                        fs.outputFile(
                            path.join(input.out_dir, e.message),
                            e.data,
                        );
                        break;
                    default:
                        console.log(e.event);
                }
            }),
        );
    }).finally(() => {
        console.log('构建完成');
    });
}
