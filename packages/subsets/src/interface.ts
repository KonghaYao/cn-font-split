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
export type Subsets = (number | [number, number])[][];
/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: any,
    options?: string | WriteFileOptions | undefined
) => Promise<void>;

export type InputTemplate = {
    /** wasm 替换 */
    wasm?: Partial<WASMLoadOpt>;
    /** 字体文件的相对地址，或者直接输入 buffer */
    FontPath: string | ArrayBuffer | Uint8Array;
    /** 切割后放置文件的文件夹 */
    destFold: string;
    /** 替换生成后的 CSS 文件的信息 */
    css?: Partial<{
        fontFamily: string;
        fontWeight: number | string;
        fontStyle: string;
        fontDisplay: string;
    }>;
    /** 输入的字体类型, 不输入则自动识别 */
    fontType?: FontType;
    /** 输出的字体类型，默认 woff2*/
    targetType?: FontType;

    /**
     * 控制分包内的 Unicode 字符，优先级高
     * 1. 直接传入 unicode-range 的数据模式，这个可以节省一部分性能
     */
    subsets?: Subsets;

    /** 自动分包，如果固定使用了 subsets ，那么将会自动分包剩下的 Unicode 字符 */
    autoChunk?: boolean;
    /** 配合 autoChunk 使用，预计每个包的大小，插件会尽量打包到这个大小  */
    chunkSize?: number;

    /** 输出的 css 文件的名称 ，默认为 result.css */
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
        compressLevel?: number;
    };
    /** 日志输出<副作用> */
    log?: (...args: any[]) => void;
    /** 输出文件的方式，如果你需要在特定的平台使用，那么需要适配这个函数 */
    outputFile?: IOutputFile;
};
