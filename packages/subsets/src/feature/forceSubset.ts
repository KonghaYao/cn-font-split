import { FeatureMap, decorateSubset } from './featureMap';

/** 强制分包部分的实现 */
export const forceSubset = (subsets: Set<number>[], featureMap: FeatureMap) => {
    return subsets.map((i) => decorateSubset(i, featureMap));
};
