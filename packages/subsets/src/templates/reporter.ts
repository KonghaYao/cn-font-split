import { InputTemplate, SubsetResult } from '../interface';
import { PerformanceRecord } from '../pipeline/executor';
import { env } from '../utils/env';
import { createCSS } from './css';
import { getDeviceMessage } from './device';
export type ReporterFile = ReturnType<typeof createReporter>;
export type NameTable = Record<string, string | { en: string }>;

export interface BundleReporter {
    /** 原始字节数 */
    originLength: number;
    /** ttf字节数 */
    ttfLength: number;
    /** 打包完成后总字节数 */
    bundledTotalLength: number;
    /** 原始 unicode 数 */
    originSize: number;
    /** 打包后 unicode 数 */
    bundledSize: number;
}
export type FontReporter = Awaited<ReturnType<typeof createReporter>>;

/** 创建 reporter.json 文件的文本 */
export const createReporter = async (
    subsetResult: SubsetResult,
    nameTable: NameTable,
    input: InputTemplate,
    record: PerformanceRecord[],
    bundleMessage: BundleReporter,
    css: Omit<ReturnType<typeof createCSS>, 'css'>,
) => {
    const data = subsetResult.map((i) => {
        return {
            name: i.path,
            size: i.size,
            chars: i.unicodeRange,
            diff: i.diff,
            charsSize: i.charLength,
        };
    });

    return {
        config: {
            ...input,
            // 修复 FontPath 输入二进制数据后导致的膨胀
            FontPath:
                typeof input.FontPath !== 'string'
                    ? 'it is a binary input'
                    : input.FontPath,
            threads: { ...input.threads, service: undefined },
        },
        message: nameTable,
        data,
        record,
        version: __cn_font_split_version__,
        /** 环境信息 */
        env: {
            envName: env,
            ...(await getDeviceMessage(env)),
        },
        bundleMessage,
        /** 字体的 css 相关的属性，便于使用 */
        css,
    };
};
