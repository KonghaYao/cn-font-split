declare module '@konghayao/harfbuzzjs/hb.js' {
    const a: any;
    export default a;
}

// 本包未依赖 `@types/node`，这里只补实际用到的 `createRequire` 声明。
// hbjs.js 的加载见 `font2svg.ts` 的 `loadHbjs`（按 CJS 语义求值）。
declare module 'node:module' {
    interface RequireShim {
        (id: string): any;
        resolve(id: string): string;
    }
    export function createRequire(filename: string | URL): RequireShim;
}
