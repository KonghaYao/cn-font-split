import { IContext } from '../../createContext';
import { calcContoursBorder } from './calcContoursBorder';
import { createContoursMap } from './createContoursMap';
import { PreSubsetPlugin, SubsetSetCollection } from '../../PreSubset';

export class AutoFlatPlugin implements PreSubsetPlugin {
    name = 'AutoFlat';
    async subset(
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        const { input, hb, face, ttfBufferSize } = ctx.pick(
            'input',
            'face',
            'hb',
            'ttfBufferSize',
            'bundleMessage',
            'fontTool',
        );
        const totalChars = face.collectUnicodes();
        // 创建轮廓映射，用于后续的字符轮廓计算
        const contoursMap = await createContoursMap();
        /** 单包最大轮廓数值 */
        // 计算单个分包的最大轮廓边界
        const contoursBorder = await calcContoursBorder(
            hb,
            face,
            input.targetType ?? 'woff2',
            contoursMap,
            input.chunkSize ?? 70 * 1024,
            new Set([...totalChars]),
            input.buildMode,
        );
        /** 计算合理的单个分包的理论字符上限，尽量保证不会出现超大分包 */
        // 计算单个分包的最大字符数量限制
        const maxCharSize =
            ((input.chunkSizeTolerance ?? 1.7) *
                totalChars.length *
                (input.chunkSize ?? 70 * 1024)) /
            ttfBufferSize; // 8

        return getAutoSubset(subsets, contoursBorder, contoursMap, maxCharSize);
    }
}

/** 获取自动分包方案 */

export const getAutoSubset = (
    subsetUnicode: Set<number>[],
    contoursBorder: number,
    contoursMap: Map<number, number>,
    maxCharSize: number,
) => {
    const totalChunk: Set<number>[] = [];

    // contoursMap 0 是平均值
    const defaultVal = contoursMap.get(0) as number;

    for (const unicode of subsetUnicode) {
        // featureMap 已经进行了去重

        const collection = splitArray(
            [...unicode],
            (cur) => contoursMap.get(cur) ?? defaultVal,
            contoursBorder,
        ).map((i) => new Set(i));
        totalChunk.push(...collection);
    }

    // console.log(totalChunk.flat().length);
    return totalChunk;
};

/**
 * 将数组根据给定的条件分割成多个子数组
 * 此函数主要用于处理一维数组，根据元素的某个累加属性，将其分割成多个子数组，
 * 当累加值达到或超过某个边界值时，就会开始一个新的子数组
 *
 * @param arr 原始数组，包含数字元素
 * @param getCount 一个回调函数，用于计算每个元素的累加值
 * @param border 边界值，当累加值达到或超过此值时，会开始一个新的子数组
 * @returns 返回分割后的子数组集合
 */
function splitArray(
    arr: number[],
    getCount: (num: number) => number,
    border: number,
) {
    // 初始化累加器，用于记录当前子数组的累加值
    let contoursCount = 0;
    // 初始化最后一个子数组
    let lastArr: number[] = [];
    // 使用reduce函数遍历数组，根据条件分割数组
    return arr.reduce(
        (col, cur) => {
            // 累加当前元素的值到累加器
            contoursCount += getCount(cur);
            // 当累加值达到或超过边界值时，重置累加器和最后一个子数组，并将其添加到集合中
            if (contoursCount >= border) {
                lastArr = [] as number[];
                col.push(lastArr);
                contoursCount = 0;
            }
            // 将当前元素添加到最后一个子数组中
            lastArr.push(cur);
            // 返回子数组集合
            return col;
        },
        [lastArr],
    );
}
