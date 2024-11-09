import { FontType } from './convert/detectFormat';
import { WriteFileOptions } from 'fs-extra';
import type { Buffer } from 'buffer';
import type { ReplaceProps } from './logger/templateReplacer';
import { ConvertManager } from './convert/convert.manager';
import { ISettingsParam } from 'tslog';
import { WorkerPoolOptions } from 'workerpool';
import { PreSubsetPlugin } from './PreSubset.js';

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

export type InputTemplate = {
    /**
     * 字体文件的相对地址，或者直接输入 buffer
     * @deprecated 请使用 input, 7.0 将会移除
     */
    FontPath?: string | Buffer | Uint8Array;
    /**
     * 字体文件的相对地址，或者直接输入 buffer
     */
    input: string | Buffer | Uint8Array;
    /**
     * 切割后放置文件的文件夹，如果没有文件系统，调用 outputFile 参数
     * @deprecated 请使用 outDir, 7.0 将会移除
     */
    destFold?: string;
    /**
     * 切割后放置文件的文件夹，如果没有文件系统，调用 outputFile 参数
     */
    outDir: string;
    /**
     * 可选的CSS属性配置，用于自定义字体的样式和行为。
     */
    css?: Partial<{
        /**
         * 定义字体的家族名称，这将影响文本的显示风格。
         * @default 自动解析
         */
        fontFamily: string;
        /**
         * 定义字体的重量，可以是数字、字符串或false。数字范围通常为100到900，字符串可以是预定义的值，如'normal'、'bold'。
         * @default 自动解析
         */
        fontWeight: number | string | false;
        /**
         * 定义字体的风格，如'normal'、'italic'等。
         * @default 自动解析
         */
        fontStyle: string;
        /**
         * 定义字体的显示方式，用于控制字体在加载过程中的行为。
         * @default swag
         */
        fontDisplay: string;
        /**
         * 定义字体的本地名称，如果浏览器支持该字体，则会优先使用本地安装的字体。
         * @default 同 fontFamily
         */
        /** 本地字体名称，优先级高于自动生成名称 */
        localFamily: string | string[] | false;
        /** 当 fontFamily 不支持一些 format 时，动用其它 format
         * @dev
         */
        polyfill: ({ name: string; format?: string } | string)[];
        /**
         * 控制 css 字体相关的注释内容，用于调试和优化。
         */
        comment:
            | {
                  /**
                   * 基本的构建信息
                   * @default true
                   */
                  base?: false;
                  /**
                   * 字体文件中的 name table，有字体证书相关的说明
                   * @default true
                   */
                  nameTable?: false;
                  /**
                   * 显示每个字体包含有的 unicode range 的字符, debug 用
                   * @default false
                   */
                  unicodes?: true;
              }
            | false;
        /**
         * 控制是否对 CSS 文件进行压缩，以减小文件大小。
         * @default true
         */
        compress: boolean;
    }>;
    /** 输出的字体类型，
     * @default woff2
     */
    targetType?: FontType;

    /**
     * 控制分包内的 Unicode 字符，优先级高
     */
    subsets?: Subsets;

    /**
     *  自动分包时, 根据语言地区优化分包效果, 默认开启
     */
    languageAreas?: false;

    /**
     * 配合 autoChunk 使用，预计每个包的大小，插件会尽量打包到这个大小
     * @default 71680 (70 * 1024)
     */
    chunkSize?: number;

    /**
     * 分包字符的容忍度，这个数值是基础值的倍数
     * @default  1.7
     */
    chunkSizeTolerance?: number;

    /**
     * 最大允许的分包输出字体文件数目，超过这个数目，程序报错退出
     * @default 600
     */
    maxAllowSubsetsCount?: number;

    /**
     * 输出的 css 文件的名称
     * @default result.css
     */
    cssFileName?: string;

    /** 是否输出 HTML 测试文件
     * @default: true
     */
    testHTML?: boolean;

    /** 是否输出报告文件
     * @default true
     */
    reporter?: boolean;

    /**
     * 是否输出预览图
     */
    previewImage?: {
        /**
         * 图中需要显示的文本
         * @default 中文网字计划\nThe Project For Web
         */
        text?: string;
        /**
         * 预览图的文件名，不用带后缀名
         * @default preview.svg
         */
        name?: string;
    };
    /**
     * 日志输出<副作用>
     */
    log?: (...args: any[]) => void;

    /**
     * tslog 的日志配置
     * @debugger
     */
    logger?: {
        settings?: ISettingsParam<unknown>;
    };
    /**
     * 重命名字体名称, 可以使用 webpack 的重命名字符串
     * @default [hash][ext]
     */
    renameOutputFont?: string | ((replaceProps: ReplaceProps) => string);

    /**
     * 输出文件的函数，
     * @description 如果你需要在特定的平台使用，那么需要适配这个函数
     */
    outputFile?: IOutputFile;

    /**
     * 构建模式
     * @default 'speed'
     * @description 构建模式默认为 speed
     */
    buildMode?: 'stable' | 'speed';

    threads?:
        | {
              /**
               * 服务对象，用于多线程处理
               * @protected
               */
              service?: ConvertManager;
              /*
               * 是否进行多线程切割
               * @default true
               */
              split?: boolean;
              /* workerpool 允许的配置项 */
              options?: WorkerPoolOptions;
          }
        | false;
    /**
     * 字体复杂字形等特性的支持
     * @default true
     */
    fontFeature?: boolean;
    /**
     * 将零散的字符集合并到字体中
     * @default false
     */
    reduceMins?: boolean;
    /**
     * 自动分割每个大包为小包
     * @default true
     */
    autoSubset?: boolean;
    /**
     * 是否将剩余的字符集添加到结果中
     * @default true
     */
    subsetRemainChars?: boolean;

    /** 自定义插件  */
    plugins?: PreSubsetPlugin[];
};
