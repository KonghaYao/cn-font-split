import { api_interface } from '../../gen/index.js';
import fs from 'fs-extra';
import path from 'node:path';
import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
export * from '../interface.js';
/** @ts-ignore */
const D = Deno;
let binPath = D.env.get('CN_FONT_SPLIT_BIN');
if (!binPath) {
    binPath = new URL(
        './' +
            getBinName(
                matchPlatform(process.platform, process.arch, () => false),
            ),
        import.meta.url,
    );
    console.log(binPath);
    // throw new Error('CN_FONT_SPLIT_BIN is undefined!');
}
const dylib = D.dlopen(binPath, {
    font_split: { parameters: ['buffer', 'usize', 'function'], result: 'void' },
} as const);
const createCallback = (cb: (data: Uint8Array) => void) =>
    new D.UnsafeCallback(
        {
            parameters: ['pointer', 'usize'],
            result: 'void',
        } as const,
        (success: any, length: number) => {
            let buffer = new D.UnsafePointerView(success).getArrayBuffer(
                Number(length),
            );
            cb(new Uint8Array(buffer));
        },
    ).pointer;

const font_split = dylib.symbols.font_split;
export async function fontSplit(data: FontSplitProps, manualClose = false) {
    const input = new api_interface.InputTemplate(data);
    if (!input.out_dir) throw new Error('cn-font-split need out_dir');
    return new Promise<void>((res) => {
        const buffer = input.serialize();
        font_split(
            buffer,
            buffer.length,
            createCallback((data: Uint8Array) => {
                let e = api_interface.EventMessage.deserialize(data);
                console.log(e.event);
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
