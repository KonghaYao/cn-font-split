import type { MessageInitShape } from '@bufbuild/protobuf';
import type { WriteFileOptions } from 'fs-extra';
import type { InputTemplateSchema, OutputReport } from './gen/index_pb.js';

/** InputTemplate 的初始化入参（等价于旧版 `InputTemplate.fromObject` 的参数） */
export type OriginInput = MessageInitShape<typeof InputTemplateSchema>;

/**
 * 把 InputTemplate 的 proto 字段拍平成「全字段可选」的配置形状：
 * 去掉 `input`/`subsets`（下面换了类型）与 protobuf 运行时元字段
 * （`$typeName`/`$unknown`），嵌套消息仍接受部分对象。
 */
type FontSplitProtoProps = {
    [K in keyof OriginInput as K extends
        | '$typeName'
        | '$unknown'
        | 'input'
        | 'subsets'
        ? never
        : K]?: OriginInput[K];
};

export type FontSplitProps = FontSplitProtoProps & {
    outputFile?: IOutputFile;
    input: string | Uint8Array;
    subsets?: number[][];
    /** 减少汇报日志 */
    silent?: boolean;
};
/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: Uint8Array | string,
    options?: WriteFileOptions | undefined,
) => Promise<void>;

/**
 * `decodeReporter` 的返回类型。
 * 旧版是 `OutputReport.toObject()` 的普通对象，现在是 @bufbuild/protobuf 的消息对象：
 * 未设置的 optional 字段为 `undefined`（旧版返回 proto 默认值）。
 */
export type FontReporter = OutputReport;
