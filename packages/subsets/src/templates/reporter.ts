import { InputTemplate, SubsetResult } from "../interface";
import { PerformanceRecord } from "../pipeline/executor";
export type ReporterFile = ReturnType<typeof createReporter>
export type NameTable = Record<string, string | { en: string }>
export const createReporter = (
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
        };
    });

    return {
        // 修复 FontPath 输入二进制数据后导致的膨胀
        config: { ...input, fontPath: typeof input.FontPath !== "string" ? 'it is a binary input' : input.FontPath },
        message: nameTable,
        data,
        record,
    }
};
