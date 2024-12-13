/** @ts-ignore */
import { dlopen, FFIType, ptr, JSCallback, toArrayBuffer } from "bun:ffi";

import { api_interface } from '../gen/index'
import fs from 'fs-extra'
import path from 'path'
import { FontSplitProps } from "./js";
export * from './js'

export async function fontSplit(data: FontSplitProps, manualClose = false) {
    const input = api_interface.InputTemplate.fromObject(data)
    if (!input.out_dir) throw new Error("cn-font-split need out_dir")
    return new Promise<void>((res) => {
        const buffer = input.serialize()
        font_split(ptr(buffer), buffer.length, createCallback((data: Uint8Array) => {
            let e = api_interface.EventMessage.deserialize(data)
            switch (e.event) {
                case api_interface.EventName.END:
                    res()
                    break
                case api_interface.EventName.OUTPUT_DATA:
                    fs.outputFile(path.join(input.out_dir, e.message), e.data)
                    break
                default:
                    console.log(e.event)
            }
        }))
    }).finally(() => {
        console.log("构建完成")
    })
}

const {
    symbols: {
        font_split,
    },
    close,
} = dlopen(
    process.env.CN_FONT_SPLIT_BIN,
    {
        font_split: {
            args: [FFIType.ptr, FFIType.usize, FFIType.callback],
            returns: FFIType.void,
        },
    },
);
const createCallback = (cb: (data: Uint8Array) => void) => new JSCallback(
    (ptr: any, length: BigInt) => {
        const data = new Uint8Array(toArrayBuffer(ptr, 0, Number(length)), 0, Number(length))
        cb(data)
    },
    {
        returns: FFIType.void,
        args: [FFIType.ptr, FFIType.usize],
    },
).ptr;