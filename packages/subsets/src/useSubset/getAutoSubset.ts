import {
    FeatureMap,
    processSingleUnicodeWithFeature,
} from '../feature/featureMap';

/** 获取自动分包方案 */

export const getAutoSubset = (
    subsetUnicode: number[],
    contoursBorder: number,
    contoursMap: Map<number, number>,
    featureMap: FeatureMap,
    maxCharSize: number,
) => {
    let count = 0;
    let cache: number[] = [];
    const totalChunk: number[][] = [];

    const defaultVal = contoursMap.get(0) as number;
    for (const unicode of subsetUnicode) {
        // featureMap 已经进行了去重
        const unicodeSet = processSingleUnicodeWithFeature(unicode, featureMap);

        const sum = unicodeSet.reduce(
            (col, cur) => col + (contoursMap.get(cur) ?? defaultVal),
            0,
        );
        // contoursMap 0 是平均值
        count += sum;
        cache.push(...unicodeSet);

        if (count >= contoursBorder || cache.length >= maxCharSize) {
            totalChunk.push(cache);
            cache = [];
            count = 0;
        }
    }
    if (cache.length) totalChunk.push(cache);

    // console.log(totalChunk.flat().length);
    return totalChunk;
};
