import { FontSplitProps } from '../interface.js';
import { resolveBinPath } from '../load.js';
import { createAPI } from '../createAPI.js';
export * from '../interface.js';
export * from '../createAPI.js';
/** @ts-ignore */
const _Deno = Deno;
// Deno 没有可靠的 musl 判定，按项目现有约定视为 glibc；
// 解析走 node:module 的 createRequire（import.meta.resolve 对 optionalDependencies 不可用）。
const binPath = resolveBinPath();
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
