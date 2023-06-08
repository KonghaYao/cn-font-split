import { InputTemplate, SubsetResult } from "../interface.js";
import { PerformanceRecord } from "../pipeline/executor.js";
export const createReporter = (
    subsetResult: SubsetResult,
    fontData: Record<string, string>,
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
    return JSON.stringify({
        config: input,
        message: fontData,
        data,
        record,
    });
};
