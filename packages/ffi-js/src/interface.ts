import { WriteFileOptions } from 'fs-extra';
import { api_interface } from './gen/index.js';
export type FontSplitProps = Parameters<
    (typeof api_interface.InputTemplate)['fromObject']
>[0] & {
    outputFile?: IOutputFile;
};
/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: Uint8Array | string,
    options?: WriteFileOptions | undefined,
) => Promise<void>;
