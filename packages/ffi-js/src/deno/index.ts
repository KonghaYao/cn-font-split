import { FontSplitProps } from '../interface.js';
import { getBinName, matchPlatform } from '../load.js';
import { createAPI } from '../createAPI.js';
export * from '../interface.js';
/** @ts-ignore */
const _Deno = Deno;
let binPath = _Deno.env.get('CN_FONT_SPLIT_BIN');
if (!binPath) {
    binPath = new URL(
        '../' +
            getBinName(
                matchPlatform(process.platform, process.arch, () => false),
            ),
        import.meta.url,
    );
    // throw new Error('CN_FONT_SPLIT_BIN is undefined!');
}
const dylib = _Deno.dlopen(binPath, {
    font_split: { parameters: ['buffer', 'usize', 'function'], result: 'void' },
} as const);
const createCallback = (cb: (data: Uint8Array) => void) =>
    new _Deno.UnsafeCallback(
        {
            parameters: ['pointer', 'usize'],
            result: 'void',
        } as const,
        (success: any, length: number) => {
            let buffer = new _Deno.UnsafePointerView(success).getArrayBuffer(
                Number(length),
            );
            cb(new Uint8Array(buffer.slice()));
        },
    ).pointer;

export const fontSplit = createAPI(dylib.symbols.font_split, createCallback);
