declare module '@konghayao/_font_' {
    import { type FontReporter } from 'cn-font-split/dist/interface';
    export const css: NonNullable<FontReporter['css']>;
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

declare module '*.otf*?subsets' {
    export * from '@konghayao/_font_';
}
