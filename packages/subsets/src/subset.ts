import { HB } from "./hb";
import { timeRecordFormat } from "./utils/timeCount";
import { IOutputFile, SubsetResult, Subsets } from "./interface";
import { convert } from "./font-converter";
import { FontType } from "./detectFormat";
import md5 from "md5";
import byteSize from "byte-size";
import { subsetToUnicodeRange } from "./utils/subsetToUnicodeRange";
import { IContext } from "./fontSplit/context";
import { getExtensionsByFontType } from "./utils/getExtensionsByFontType";
import { subsetFont } from "./subsetService/subsetFont";

export const countSubsetChars = (subset: (number | [number, number])[]) => {
    return subset.reduce((col: number, cur) => {
        col += 1;
        return typeof cur === "number" ? col : col + (cur[1] - cur[0]);
    }, 0);
};

export const subsetAll = async (
    face: HB.Face,
    hb: HB.Handle,
    subsets: Subsets,
    outputFile: IOutputFile,
    targetType: FontType,
    ctx: IContext
): Promise<SubsetResult> => {
    const { input } = ctx.pick("input");
    const ext = getExtensionsByFontType(targetType);

    const subsetMessage: SubsetResult = [];
    ctx.trace("id \t分包时间及速度 \t转换时间及速度\t分包最终情况");
    for (let index = 0; index < subsets.length; index++) {
        const subset = subsets[index];
        const start = performance.now();
        const [buffer, arr] = await subsetFont(face, subset, hb, {
            threads: input.threads,
        });
        const middle = performance.now();
        if (buffer) {
            const transferred = await convert(buffer, targetType);
            const end = performance.now();
            ctx.trace(
                [
                    index,
                    timeRecordFormat(start, middle),
                    (arr.length / (middle - start)).toFixed(2) + "字符/ms",
                    timeRecordFormat(middle, end),
                    (arr.length / (end - middle)).toFixed(2) + "字符/ms",
                    byteSize(transferred.byteLength) + "/" + arr.length,
                ].join(" \t")
            );
            const hashName = md5(transferred);
            await outputFile(hashName + ext, transferred);
            subsetMessage.push({
                hash: hashName,
                path: hashName + ext,
                size: transferred.byteLength,
                subset,
                unicodeRange: subsetToUnicodeRange(subset),
            });
        } else {
            ctx.warn([index, "未发现字符", "取消分包"].join("\t"));
        }
    }

    return subsetMessage;
};
