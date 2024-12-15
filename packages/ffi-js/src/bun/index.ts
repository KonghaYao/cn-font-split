/** @ts-ignore */
import { dlopen, FFIType, ptr, JSCallback, toArrayBuffer } from 'bun:ffi';

import { api_interface } from '../gen/index.js';
import fs from 'fs-extra';
import path from 'path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { isMusl } from '../node/isMusl.js';
export * from '../interface.js';

export async function fontSplit(data: FontSplitProps) {
    const input = api_interface.InputTemplate.fromObject(data);
    if (!input.out_dir) throw new Error('cn-font-split need out_dir');
    return new Promise<void>((res) => {
        const buffer = input.serialize();
        font_split(
            ptr(buffer),
            buffer.length,
            createCallback((data: Uint8Array) => {
                let e = api_interface.EventMessage.deserialize(data);
                switch (e.event) {
                    case api_interface.EventName.END:
                        res();
                        break;
                    case api_interface.EventName.OUTPUT_DATA:
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
