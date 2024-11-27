/** @ts-ignore */
import { dlopen, FFIType, ptr, JSCallback, toArrayBuffer } from "bun:ffi";

import { api_interface } from '../gen/index'
import fs from 'fs-extra'
import path from 'path'

type ProtoInput = Parameters<typeof api_interface.InputTemplate.fromObject>[0]
export interface FontSplitConifg extends ProtoInput {
}

export async function fontSplit(data: FontSplitConifg, manualClose = false) {
    const input = new api_interface.InputTemplate(data)
    if (!input.out_dir) throw new Error("cn-font-split need out_dir")
    return new Promise<void>((res) => {
        const buffer = input.serialize()
        font_split(ptr(buffer), buffer.length, createCallback((data: Uint8Array) => {
            let e = api_interface.EventMessage.deserialize(data)
            console.log(e.event)
            switch (e.event) {
                case "end":
                    res()
                    break
                case "output_data":
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
            args: [FFIType.ptr, FFIType.i32, FFIType.callback],
            returns: FFIType.void,
        },
    },
);
const createCallback = (cb: (data: Uint8Array) => void) => new JSCallback(
    (ptr: any, length: number) => {
        const data = new Uint8Array(toArrayBuffer(ptr, 0, length), 0, length)
        cb(data)
    },
    {
        returns: FFIType.void,
        args: ["ptr", FFIType.usize],
    },
).ptr;