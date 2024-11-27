import { DataType, open, close, load, createPointer, funcConstructor, arrayConstructor, unwrapPointer } from "ffi-rs";
import { api_interface } from '../gen/index'
export function startFontSplit() {
    const binPath = process.env.CN_FONT_SPLIT_BIN
    if (!binPath) throw new Error("CN_FONT_SPLIT_BIN is undefined!")
    open({
        library: 'libffi',
        path: binPath
    })
}

type ProtoInput = Parameters<typeof api_interface.InputTemplate.fromObject>[0]
export interface FontSplitConifg extends ProtoInput {
}

export function fontSplit(data: FontSplitConifg) {
    const input = api_interface.InputTemplate.fromObject(data)
    return new Promise<void>((res) => {
        runFFI(input.serialize(), (data) => {
            let e = api_interface.EventMessage.deserialize(data)
            if (e.event === 'end') {
                res()
            }
        })
    })
}
function runFFI(binary: Uint8Array, callback: (res: Uint8Array) => void) {
    const func = (a: Uint8Array, b: number) => {
        let rightArray = a.slice(0, b);
        callback(rightArray)
    };
    // suggest using createPointer to create a function pointer for manual memory management
    const funcExternal = createPointer({
        paramsType: [funcConstructor({
            paramsType: [
                arrayConstructor({
                    type: DataType.U8Array,
                    length: 1024 * 256,
                }),
                DataType.I32
            ],
            retType: DataType.Void,
        })],
        paramsValue: [func]
    })
    load({
        library: "libffi",
        funcName: 'font_split',
        retType: DataType.Void,
        paramsType: [DataType.U8Array, DataType.I32, DataType.External],
        paramsValue: [binary, binary.length, unwrapPointer(funcExternal)[0]],
        freeResultMemory: true,
    })
    // close("libffi");
}