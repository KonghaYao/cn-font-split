import { IOutputFile, Subset } from "../interface";
import md5 from "md5";
import { subsetToUnicodeRange } from "../utils/subsetToUnicodeRange";

export async function createRecord(
    outputFile: IOutputFile,
    ext: string,
    transferred: Uint8Array,
    subset: Subset
) {
    const hashName = md5(transferred);
    await outputFile(hashName + ext, transferred);

    return {
        size: transferred.byteLength,
        hash: hashName,
        path: hashName + ext,
        unicodeRange: subsetToUnicodeRange(subset),
        subset,
    };
}
