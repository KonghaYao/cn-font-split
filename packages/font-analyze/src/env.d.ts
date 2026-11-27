// 上游包没有自带 d.ts，也没有 exports 映射；这里给入口与深路径同时补声明，
// 让 tsc 沿用 @types/opentype.js 的类型。
declare module '@konghayao/opentype.js' {
    export * from '@types/opentype.js';
}

// Node 原生 ESM 只能走这个深路径（上游 main 是绝对路径，见 src/index.ts 注释）。
declare module '@konghayao/opentype.js/dist/opentype.module.js' {
    export * from '@types/opentype.js';
}
