import { UnicodeRange } from '@japont/unicode-range';
import { IOutputFile, InputTemplate, SubsetResult } from '../interface';
import { templateReplace, type ReplaceProps } from './templateReplacer';

/** 从构建完成的分包信息中创建分包记录 */
export async function createRecord(
    outputFile: IOutputFile,
    transferred: Uint8Array,
    chunk: number[],
    subset: number[],
    filename: string,
): Promise<SubsetResult[0]> {
    await outputFile(filename, transferred);
    const str = UnicodeRange.stringify(subset);
    return {
        size: transferred.byteLength,
        path: filename,
        unicodeRange: str.join(','),
        subset: str.map((i) => {
            i = i.replace('U+', '');
            if (i.includes('-')) {
                return i.split('-').map((i) => parseInt(i)) as [number, number];
            } else {
                return parseInt(i);
            }
        }),
        diff: chunk.length - subset.length,
        charLength: subset.length,
    };
}

/** 根据文件 hash 值，进行命名 */
export function getFileHashName(
    input: InputTemplate,
    transferred: Uint8Array,
    ext: string,
    index: number,
) {
    const renameOutputFont = input.renameOutputFont || '[hash][ext]';
    const replaceProps: ReplaceProps = {
        transferred,
        ext,
        index,
    };
    const filename =
        typeof renameOutputFont === 'string'
            ? templateReplace(renameOutputFont, replaceProps)
            : renameOutputFont(replaceProps);
    return filename;
}
