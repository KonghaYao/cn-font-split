import { fromBinary, toJson } from '@bufbuild/protobuf';
import { OutputReportSchema, type OutputReport } from './gen/index_pb.js';

export const decodeReporter = (reporterBin: Uint8Array): OutputReport => {
    return fromBinary(OutputReportSchema, reporterBin);
};

/**
 * 把 `OutputReport` 转成可直接 `JSON.stringify` 的普通对象（proto3 JSON 映射）。
 * 旧版的 `OutputReport.toObject()` 已随 google-protobuf 一起移除，需要普通对象时用这个。
 */
export const reporterToJSON = (
    reporter: OutputReport,
): Record<string, unknown> => {
    return toJson(OutputReportSchema, reporter) as Record<string, unknown>;
};
