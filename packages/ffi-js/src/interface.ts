import { WriteFileOptions } from 'fs-extra';
import { api_interface } from './gen/index.js';
export type OriginInput = Parameters<(typeof api_interface.InputTemplate)['fromObject']>[0]
export type FontSplitProps = Omit<
    OriginInput,
    'input'|'subsets'
> & {
    outputFile?: IOutputFile;
    input: string | Uint8Array;
    subsets: number[][]
};
/** 替换系统内部的文件输出方式 */
export type IOutputFile = (
    file: string,
    data: Uint8Array | string,
    options?: WriteFileOptions | undefined,
) => Promise<void>;
