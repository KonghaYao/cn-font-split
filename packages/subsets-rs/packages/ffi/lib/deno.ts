
import { api_interface } from '../gen/index'
import fs from 'fs-extra';
import path from "node:path";
/** @ts-ignore */
const D = Deno

const dylib = D.dlopen(
    D.env.get("CN_FONT_SPLIT_BIN"),
    {
        "font_split": { parameters: ["buffer", "usize", 'function'], result: "void" },
    } as const,
);
const createCallback = (cb: (data: Uint8Array) => void) => new D.UnsafeCallback(
    {
        parameters: ["pointer", 'usize'],
        result: "void",
    } as const,
    (success: any, length: number) => {
        let buffer = new D.UnsafePointerView(success).getArrayBuffer(Number(length))
        cb(new Uint8Array(buffer))
    },
).pointer;


type ProtoInput = Parameters<typeof api_interface.InputTemplate.fromObject>[0]
export interface FontSplitConifg extends ProtoInput {
}
const font_split = dylib.symbols.font_split
export async function fontSplit(data: FontSplitConifg, manualClose = false) {
    const input = new api_interface.InputTemplate(data)
    if (!input.out_dir) throw new Error("cn-font-split need out_dir")
    return new Promise<void>((res) => {
        const buffer = input.serialize()
        font_split(buffer, buffer.length, createCallback((data: Uint8Array) => {
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
