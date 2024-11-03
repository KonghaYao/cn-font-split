import { FeatureList } from './FeatureList';
import { Subset } from '../interface';
import {
    FontBaseTool,
    getCMapFromTool,
    getFeatureQueryFromBuffer,
    getGlyphIDToUnicodeMap,
} from './getFeatureQueryFromBuffer';

/** 从字体中获取 Feature 的数据数组 */
export const getFeatureData = (fontTool: FontBaseTool) => {
    const featureQuery = getFeatureQueryFromBuffer(fontTool);
    getCMapFromTool(fontTool);
    const glyphIDToUnicodeMap = getGlyphIDToUnicodeMap(fontTool);
    return FeatureList.flatMap((i) => {
        return (
            featureQuery
                .getFeature(i)
                ?.map((ii) => [ii.sub, ii.by].flat())
                .map((ids) =>
                    ids
                        .map((id) => {
                            return glyphIDToUnicodeMap.get(id) ?? [];
                        })
                        .flat(),
                ) ?? []
        );
    }).filter((i) => i.length > 1);
};

/** 将多个关系行，合并为元素的合集映射 */
export const getFeatureMap = (featureData: number[][]) => {
    const featureMap = new Map<number, Set<number>>();
    featureData.forEach((relationArray) => {
        for (const unicode of relationArray) {
            const isExist = featureMap.has(unicode);
            if (isExist) {
                const item = featureMap.get(unicode) as Set<number>;
                relationArray.forEach((i) => item.add(i));
                item.forEach((i) => featureMap.set(i, item));
                break;
            } else {
                featureMap.set(unicode, new Set(relationArray));
            }
        }
    });
    return featureMap;
};
export type FeatureMap = Map<number, Set<number> | null>;

/** 从单个 unicode 中找出 feature 相关的数据 */
export const processSingleUnicodeWithFeature = (
    i: number,
    featureMap: FeatureMap,
) => {
    const item = featureMap.get(i);
    if (item === undefined) {
        // undefined 说明该 unicode 没有 feature，不用处理
        return [i];
    } else if (item === null) {
        // null 表示以及被当作 feature的一部分进行处理过了，所以不用再次处理了
        return [];
    } else {
        // 有 feature 存在， 返回 feature 数组表示这些 unicode 值都需要包括到一个包中，同时将这些 unicode 码点从中取消
        item.forEach((i) => featureMap.set(i, null));

        return [...item];
    }
};

/**
 * 装饰普通的 Subset 使其能够使用 opentype feature
 */
export const decorateSubset = (subset: Set<number>, featureMap: FeatureMap) => {
    const result = new Set<number>();
    subset.forEach((i) => {
        return processSingleUnicodeWithFeature(i, featureMap).forEach((i) =>
            result.add(i),
        );
    });
    return result;
};
