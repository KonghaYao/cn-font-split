import { UnicodeRange } from '@japont/unicode-range';
import { IOutputFile, InputTemplate, SubsetResult } from '../interface';
import { templateReplace, type ReplaceProps } from './templateReplacer';

/** 从构建完成的分包信息中创建分包记录 */
export async function createRecord(
    outputFile: IOutputFile,
    ext: string,
    transferred: Uint8Array,
    chunk: number[],
    subset: number[],
    input: InputTemplate,
    index: number,
): Promise<SubsetResult[0]> {
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
