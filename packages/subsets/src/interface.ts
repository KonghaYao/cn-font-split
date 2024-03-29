import { FontType } from './utils/detectFormat';
import { WriteFileOptions } from 'fs-extra';
import type { Buffer } from 'buffer';
import type { ReplaceProps } from './useSubset/templateReplacer';
/** subset 切割完毕后的数据格式 */
export type SubsetResult = {
    unicodeRange: string;
    subset: Subset;
    path: string;
    size: number;
    diff: number;
    charLength: number;
}[];
/** unicode-range的数据表示格式 */
export type Subset = (number | [number, number])[];

/** unicode-range的数据数组 */
export type Subsets = Subset[];

/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: Uint8Array | string,
    options?: WriteFileOptions | undefined,
) => Promise<void>;
import { ConvertManager } from './convert/convert.manager';
import { ISettingsParam } from 'tslog';
import { WorkerPoolOptions } from 'workerpool';
export type InputTemplate = {
    /** 字体文件的相对地址，或者直接输入 buffer */
    FontPath: string | Buffer | Uint8Array;
    /** 切割后放置文件的文件夹，如果没有文件系统，调用 outputFile 参数 */
    destFold: string;
    /** 替换生成后的 CSS 文件的信息 */
    css?: Partial<{
        fontFamily: string;
        fontWeight: number | string | false;
        fontStyle: string;
        fontDisplay: string;
        /** 本地字体名称，优先级高于自动生成名称 */
        localFamily: string | string[] | false;
        /** 当 fontFamily 不支持一些 format 时，动用其它 format */
        polyfill: ({ name: string; format?: string } | string)[];
        comment:
            | {
                  /**
                   * cn-font-split 相关的数据
                   * @default true
                   */
                  base?: false;
                  /**
                   * 字体文件中的 name table，有字体证书相关的说明
                   * @default true
                   */
                  nameTable?: false;
                  /**
                   * 显示每个字体包含有的 unicode range 的字符, debug 专用
                   * @default false
                   */
                  unicodes?: true;
              }
            | false;
        compress: boolean;
    }>;
    /** 输出的字体类型，默认 woff2 */
    targetType?: FontType;

    /**
     * 控制分包内的 Unicode 字符，优先级高
     */
    subsets?: Subsets;

    /** 自动分包，如果使用了 subsets 参数，那么将会自动分包剩下的 Unicode 字符 */
    autoChunk?: boolean;
    /*  自动分包时使用，优先分包这些字符 */
    unicodeRank?: number[][];
    /** 配合 autoChunk 使用，预计每个包的大小，插件会尽量打包到这个大小  */
    chunkSize?: number;
    /** 分包字符的容忍度，这个数值是基础值的倍数 */
    chunkSizeTolerance?: number;
    /** 最大允许的分包数目，超过这个数目，程序报错退出 */
    maxAllowSubsetsCount?: number;
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
    };
    /**
     * 日志输出<副作用>
     */
    log?: (...args: any[]) => void;

    logger?: {
        settings?: ISettingsParam<unknown>;
    };
    /** 自定义输出字体名称，优先于 outputFile，用于缩短字体文件名称 */
    renameOutputFont?: string | ((replaceProps: ReplaceProps) => string);
    /** 输出文件的方式，如果你需要在特定的平台使用，那么需要适配这个函数 */
    outputFile?: IOutputFile;
    threads?:
        | {
              /**
               * 服务对象，用于多线程处理
               * @protected
               */
              service?: ConvertManager;
              /* 是否进行多线程切割 */
              split?: boolean;
              /* workerpool 允许的配置项 */
              options?: WorkerPoolOptions;
          }
        | false;
    /**
     * 字体复杂字形等特性的支持
     * @todo
     */
    fontFeature?: boolean;
};
