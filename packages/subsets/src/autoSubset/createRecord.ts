import { UnicodeRange } from "@japont/unicode-range";
import { IOutputFile, Subset } from "../interface";
import md5 from "../utils/md5";
import { subsetToUnicodeRange } from "../utils/subsetToUnicodeRange";

export async function createRecord(
    outputFile: IOutputFile,
    ext: string,
    transferred: Uint8Array,
    subset: number[]
) {
    const hashName = md5(transferred);
    await outputFile(hashName + ext, transferred);
    const str = UnicodeRange.stringify(subset)

    return {
        size: transferred.byteLength,
        hash: hashName,
        path: hashName + ext,
        unicodeRange: str.join(','),
        // unicodeRange: subsetToUnicodeRange(subset),
        subset: str.map(i => {
            i = i.replace("U+", '')
            if (i.includes("-")) {
                return i.split("-").map(i => parseInt(i)) as [number, number]
            } else {
                return parseInt(i)
            }
        }),
    };
}
