import { FontType } from "./font-converter.js";
import { WriteFileOptions } from "fs-extra";

export type WASMLoadOpt = Record<
    "harfbuzz",
    string | Response | (() => Promise<string | Response>)
>;
/** subset 切割完毕后的数据格式 */
export type SubsetResult = {
    hash: string;
    unicodeRange: string;
    path: string;
    size: number;
}[];

/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: any,
    options?: string | WriteFileOptions | undefined
) => Promise<void>;

export type InputTemplate = {
    /** wasm 替换 */
    wasm?: Partial<WASMLoadOpt>;
    /** 字体文件的相对地址 */
    FontPath: string | ArrayBuffer | Uint8Array;
    /** 切割后字体 */
    destFold: string;
    /** 生成后的 CSS 文件的信息 */
    css?: Partial<{
        fontFamily: string;
        fontWeight: number | string;
        fontStyle: string;
        fontDisplay: string;
    }>;
    /** 输入的字体类型 */
    fontType?: FontType;
    /** 输出的字体类型，默认 ttf；woff，woff2 也可以*/
    targetType?: FontType;
    /** 预计每个包的大小，插件会尽量打包到这个大小  */
    chunkSize?: number;
    /** 输出的 css 文件的名称  */
    cssFileName?: string;

    /** 是否输出 HTML 测试文件  */
    testHTML?: boolean;
    /** 是否输出报告文件  */
    reporter?: boolean;
    /** 是否输出预览图 */
    previewImage?: {
        /** 图中需要显示的文本 */
        text?: string;
        /** 预览图的文件名，不用带后缀名 */
        name?: string;
    };
    /** 日志输出<副作用> */
    log?: (...args: any[]) => void;
    /** 输出文件的方式 */
    outputFile?: IOutputFile;
};
