import { FontSplitProps } from './interface.js';

const loadFontSplit = async () => {
    let fontSplit = null;
    /** @ts-ignore */
    if (typeof globalThis.Bun !== 'undefined') {
        console.log('cn-font-split using Bun Native FFI');
        fontSplit = (await import('./bun/index.js')).fontSplit;
        /** @ts-ignore */
    } else if (typeof globalThis.Deno !== 'undefined') {
        console.log('cn-font-split using Deno Native FFI');
        fontSplit = (await import('./deno/index.js')).fontSplit;
    } else {
        console.log('cn-font-split using Node FFI');
        fontSplit = (await import('./node/index.js')).fontSplit;
    }
    return fontSplit;
};

const f = loadFontSplit();
let fontSplit = async (config: FontSplitProps) => {
    return (await f)(config);
};
export * from './interface.js';
export * from './createAPI.js';
export { fontSplit };
export default fontSplit;
