import { Context } from '../pipeline/index';
import { findOutliers } from './findOutliers';

export const reduceMinsPackage = (
    fullSubsets: number[][],
    ctx: Context<unknown>,
) => {
    // 清理整个分包算法结果中的离群最小值
    const [mins, largePart, min] = findOutliers(
        fullSubsets,
        fullSubsets.map((i) => i.length),
        1,
    );
    const minsLength = mins.length;
    if (!mins.length) return fullSubsets;

    const combinedMinsPart = mins
        .sort((a, b) => a.length - b.length)
        .reduce(
            (col, cur) => {
                const last = col[col.length - 1];
                if (last.length + cur.length <= min * 1.1) {
                    last.push(...cur);
                } else {
                    col.push([...cur]);
                }
                return col;
            },
            [[]] as number[][],
        );
    ctx.info(`减少分包碎片 ${minsLength} => ${combinedMinsPart.length}  `);
    return [...combinedMinsPart, ...largePart];
};
