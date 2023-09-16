import { InputTemplate, SubsetResult } from "../interface";
import { PerformanceRecord } from "../pipeline/executor";
import { env } from '../utils/env';
import { getDeviceMessage } from './device'
export type ReporterFile = ReturnType<typeof createReporter>
export type NameTable = Record<string, string | { en: string }>


export interface BundleReporter {
    size: {
        byteLength: number,
        ttfLength: number,
        bundledTotalLength: number
    }
}

export const createReporter = async (
    subsetResult: SubsetResult,
    nameTable: NameTable,
    input: InputTemplate,
    record: PerformanceRecord[]
) => {
    const data = subsetResult.map((i) => {
        return {
            name: i.path,
            size: i.size,
            chars: i.unicodeRange,
            diff: i.diff,
            charsSize: i.charLength
        };
    });

    return {
        // 修复 FontPath 输入二进制数据后导致的膨胀
        config: {
            ...input,
            fontPath: typeof input.FontPath !== "string" ? 'it is a binary input' : input.FontPath,
            threads: { ...input.threads, service: undefined }
        },
        message: nameTable,
        data,
        record,
        version: __cn_font_split_version__,
        env: {
            envName: env,
            ...await getDeviceMessage(env)
        },
    }
};
