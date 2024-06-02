declare module '@konghayao/_font_' {
    import { fontSplit } from '@konghayao/cn-font-split';
    type Reporter = Awaited<ReturnType<typeof fontSplit>>;
    export const css: Reporter['css'];
}

declare module '*.ttf' {
    export * from '@konghayao/_font_';
}

declare module '*.otf' {
    export * from '@konghayao/_font_';
}
declare module '*.ttf?subsets' {
    export * from '@konghayao/_font_';
}

declare module '*.otf?subsets' {
    export * from '@konghayao/_font_';
}
