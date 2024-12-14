import {
    DataType,
    open,
    close,
    load,
    createPointer,
    funcConstructor,
    arrayConstructor,
    unwrapPointer,
    freePointer,
    PointerType,
    JsExternal,
} from 'ffi-rs';
import { api_interface } from '../gen/index.js';
import fs from 'fs-extra';
import path from 'path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { isMusl } from './isMusl.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
export * from '../interface.js';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);

let opened = false;
function startFontSplit() {
    if (opened) return;
    let binPath = process.env.CN_FONT_SPLIT_BIN;
    if (!binPath) {
        binPath = path.join(
            __dirname,
            getBinName(matchPlatform(process.platform, process.arch, isMusl)),
        );
        // throw new Error('CN_FONT_SPLIT_BIN is undefined!');
    }
    open({
        library: 'libffi',
        path: binPath,
    });
    opened = true;
}
export function endFontSplit() {
    HelpfulPointer.clear();
    close('libffi');
    opened = false;
}

export async function fontSplit(data: FontSplitProps, manualClose = false) {
    startFontSplit();
    const input = api_interface.InputTemplate.fromObject(data);
    if (!input.out_dir) throw new Error('cn-font-split need out_dir');
    let pointer: HelpfulPointer;
    return new Promise<void>((res) => {
        pointer = runFFI(input.serialize(), (data) => {
            let e = api_interface.EventMessage.deserialize(data);
            switch (e.event) {
                case api_interface.EventName.END:
                    res();
                    break;
                case api_interface.EventName.OUTPUT_DATA:
                    fs.outputFile(path.join(input.out_dir, e.message), e.data);
                    break;
                default:
                    console.log(e.event);
            }
        });
    }).finally(() => {
        console.log('构建完成');
        pointer?.destory();
        if (!manualClose) endFontSplit();
    });
}

class HelpfulPointer {
    static global: HelpfulPointer[] = [];
    static clear() {
        HelpfulPointer.global.forEach((i) => i.destory());
        HelpfulPointer.global = [];
    }
    constructor(public fn: (a: Uint8Array, b: number) => void) {
        HelpfulPointer.global.push(this);
        this.create();
    }
    public pointer?: JsExternal[];
    private create() {
        this.pointer = createPointer({
            paramsType: [
                funcConstructor({
                    paramsType: [
                        arrayConstructor({
                            type: DataType.U8Array,
                            length: 4 * 1024 * 1024,
                        }),
                        DataType.I32,
                    ],
                    retType: DataType.Void,
                }),
            ],
            paramsValue: [this.fn],
        });
    }
    public asExternal() {
        return unwrapPointer(this.pointer!)[0];
    }
    public destory() {
        const paramsValue = this.pointer;
        if (!paramsValue) {
            return;
        }
        freePointer({
            paramsType: [
                funcConstructor({
                    paramsType: [
                        arrayConstructor({
                            type: DataType.U8Array,
                            length: 4 * 1024 * 1024,
                        }),
                        DataType.I32,
                    ],
                    retType: DataType.Void,
                }),
            ],
            paramsValue,
            pointerType: PointerType.RsPointer,
        });
        /** @ts-ignore */
        this.fn = undefined;
        this.pointer = undefined;
    }
}

function runFFI(binary: Uint8Array, callback: (res: Uint8Array) => void) {
    const func = (a: Uint8Array, b: number) => {
        if (a.length <= b) {
            console.warn('缓存区溢出');
        }
        let rightArray = a.slice(0, b);
        callback(rightArray);
    };
    const fnPointer = new HelpfulPointer(func);
    load({
        library: 'libffi',
        funcName: 'font_split',
        retType: DataType.Void,
        paramsType: [DataType.U8Array, DataType.I32, DataType.External],
        paramsValue: [binary, binary.length, fnPointer.asExternal()],
        freeResultMemory: false,
    });
    return fnPointer;
}
