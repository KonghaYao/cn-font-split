import { FontType } from './utils/detectFormat';
import { WriteFileOptions } from 'fs-extra';
import type { Buffer } from 'buffer';
/** subset 切割完毕后的数据格式 */
export type SubsetResult = {
    hash: string;
    unicodeRange: string;
    subset: Subset;
    path: string;
    size: number;
}[];
/** unicode-range的数据表示格式 */
export type Subset = (number | [number, number])[];

/** unicode-range的数据数组 */
export type Subsets = Subset[];

/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: Uint8Array | string,
    options?: string | WriteFileOptions | undefined
) => Promise<void>;
import { ConvertManager } from './convert/convert.manager';
import { ISettingsParam } from 'tslog';
import { WorkerPoolOptions } from 'workerpool';
export type InputTemplate = {
    threads?: {
        service?: ConvertManager;
        /**
         * 多线程文本图片生成
         * @deprecated 默认已经修改为主线程执行，速度够快
         */
        image?: boolean;
        /** 多线程切割 */
        split?: boolean;
        options?: WorkerPoolOptions;
    };

    /** 字体复杂字形等特性的支持 */
    fontFeature?:
        | {
              /** 分包时，复杂字形因为彼此之间的依赖关系不能够智能分包，故 */
              maxPackageSize?: number;
          }
        | false;

    /** 字体文件的相对地址，或者直接输入 buffer */
    FontPath: string | Buffer | Uint8Array;
    /** 切割后放置文件的文件夹，如果没有文件系统，调用 outputFile 参数 */
    destFold: string;
    /** 替换生成后的 CSS 文件的信息 */
    css?: Partial<{
        fontFamily: string;
        fontWeight: number | string;
        fontStyle: string;
        fontDisplay: string;
        /** 本地字体名称，优先级高于自动生成名称 */
        localFamily: string | string[];
        /** 当 fontFamily 不支持一些 format 时，动用其它 format */
        polyfill: ({ name: string; format?: string } | string)[];
    }>;
    /**
     * 输入的字体类型, 不输入则自动识别
     * @deprecated 4.0.0 以上为自动识别
     */
    fontType?: FontType;
    /** 输出的字体类型，默认 woff2 */
    targetType?: FontType;

    /**
     * 控制分包内的 Unicode 字符，优先级高
     * @dev
     */
    subsets?: Subsets;

    /** 自动分包，如果使用了 subsets 参数，那么将会自动分包剩下的 Unicode 字符 */
    autoChunk?: boolean;
    /*  自动分包时使用，优先分包这些字符 */
    unicodeRank?: number[][];
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
    /**
     * 日志输出<副作用>
     * @dev
     */
    log?: (...args: any[]) => void;

    logger?: {
        settings?: ISettingsParam<unknown>;
    };
    /** 输出文件的方式，如果你需要在特定的平台使用，那么需要适配这个函数 */
    outputFile?: IOutputFile;
};
