declare module '*.html' {
    const a: string;
    export default a;
}

declare module 'https://*' {
    const a: any;
    export const ensureDir: any;
    export const fileURLToPath: any;
    export const Md5: any;
    export default a;
}
declare module 'omt:*' {
    const a: string;
    export default a;
}
declare module 'https://deno.land/std@0.170.0/node/url.ts' {
    export * from 'node:url';
}

declare module '@konghayao/opentype.js' {
    export * from '@types/opentype.js';
}
declare module '@konghayao/opentype.js/src/*' {
    const a: any;
    export default a;
}
declare module '@konghayao/opentype.js/dist/opentype.module.js' {
    export * from '@types/opentype.js';
}
declare module '@konghayao/opentype.js/src/tiny-inflate@1.0.3.esm.js' {
    export const tinf_uncompress: any;
}

declare module '@chinese-fonts/wawoff2' {
    export const decompress: (
        buffer: Buffer | Uint8Array,
    ) => Promise<Uint8Array>;
    export const compress: (buffer: Buffer | Uint8Array) => Promise<Uint8Array>;
}

declare type ANY = any;
// 这个是全局的静态文件声明，不要进行模块化
// export { }

declare module '@konghayao/harfbuzzjs/hb-subset.js' {
    const a: any;
    export default a;
}
declare module '@napi-rs/woff-build-wasm32-wasi/woff-build.wasi-browser' {
    export * from '@napi-rs/woff-build';
}
