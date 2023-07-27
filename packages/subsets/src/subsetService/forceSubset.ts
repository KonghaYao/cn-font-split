import { Subsets } from '../interface';
import { FeatureMap, decorateSubset } from './featureMap';

/** 强制分包部分的实现 */

export const forceSubset = (subsets: Subsets, featureMap: FeatureMap) => {
    return subsets.map((i) => decorateSubset(i, featureMap));
};
