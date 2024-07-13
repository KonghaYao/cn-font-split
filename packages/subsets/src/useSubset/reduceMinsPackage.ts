import { Context } from '../pipeline/index';
import { findOutliers } from './findOutliers';

/**
 * 合并小分包以减少分包碎片问题
 *
 * 此函数接收所有完整的子集（分包）和一个上下文对象，旨在通过合并较小的分包来减少分包的数量。
 * 它首先通过查找异常值找出所有较小的分包，然后尝试将这些较小的分包合并成更大的分包，以减少总的分包数量。
 * 这种优化有助于减少加载模块时的网络请求数量，从而提高性能。
 *
 */
export const reduceMinsPackage = (
    fullSubsets: number[][],
    ctx: Context<unknown>,
) => {
    // 查找所有较小的分包（异常值），并获取它们的集合、较大的分包集合以及最小分包大小的阈值。
    // 清理整个分包算法结果中的离群最小值
    const [mins, largePart, min] = findOutliers(
        fullSubsets,
        fullSubsets.map((i) => i.length),
        1,
    );

    // 如果没有找到较小的分包，则直接返回原始分包列表。
    const minsLength = mins.length;
    if (!mins.length) return fullSubsets;

    // 将较小的分包进行合并。
    // 首先，根据分包大小对较小的分包进行排序，以便按大小顺序进行合并。
    // 然后，通过迭代这些分包，将它们合并成更大的分包，直到达到最小分包大小的阈值。
    const combinedMinsPart = mins
        .sort((a, b) => a.length - b.length)
        .reduce(
            (col, cur) => {
                const last = col[col.length - 1];
                // 如果当前分包可以合并到最后一个分包中，则进行合并。
                if (last.length + cur.length <= min * 1.1) {
                    last.push(...cur);
                } else {
                    // 否则，将当前分包作为新的分包添加到列表中。
                    col.push([...cur]);
                }
                return col;
            },
            [[]] as number[][],
        );

    // 记录合并前后的分包数量，以供调试和监控使用。
    ctx.info(`减少分包碎片 ${minsLength} => ${combinedMinsPart.length}  `);

    // 返回合并后的分包列表，包括较小分包的合并结果和未被合并的大分包。
    return [...combinedMinsPart, ...largePart];
};
