import { UnicodeRange } from '@japont/unicode-range';
import { IOutputFile, InputTemplate, SubsetResult } from '../interface';
import md5 from '../utils/md5';
import { templateReplace } from './templateReplacer';
export async function createRecord(
    outputFile: IOutputFile,
    ext: string,
    transferred: Uint8Array,
    chunk: number[],
    subset: number[],
    input: InputTemplate,
    index: number
): Promise<SubsetResult[0]> {
    const hashName = md5(transferred);
    const renameOutputFont = input.renameOutputFont || '[hash][ext]';
    const filename =
        typeof renameOutputFont === 'string'
            ? templateReplace(renameOutputFont, { hash: hashName, index, ext })
            : renameOutputFont(hashName, ext, index);
    await outputFile(filename, transferred);
    const str = UnicodeRange.stringify(subset);
    return {
        size: transferred.byteLength,
        hash: hashName,
        filename,
        path: hashName + ext,
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
