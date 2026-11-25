declare module '@konghayao/harfbuzzjs/hb.js' {
    const a: any;
    export default a;
}

// harfbuzzjs 的 hbjs.js 只有 CommonJS 的 `module.exports`，上游未提供类型声明；
// 这里按 CJS 默认导出的语义补声明（运行时问题见 docs/REFACTOR-8.0.md §12）。
declare module '@konghayao/harfbuzzjs/hbjs.js' {
    const hbjs: (module: any) => any;
    export default hbjs;
}
