import { WriteFileOptions } from 'fs-extra';
import { api_interface } from './gen/index.js';
export type FontSplitProps = Omit<
    Parameters<(typeof api_interface.InputTemplate)['fromObject']>[0],
    'input'
> & {
    outputFile?: IOutputFile;
    input: string | Uint8Array;
};
/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: Uint8Array | string,
    options?: WriteFileOptions | undefined,
) => Promise<void>;
