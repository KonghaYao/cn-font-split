import { Font } from '@konghayao/opentype.js';
import { FeatureList } from './FeatureList';

/** Opentype 的 feature 报告 */
export const getFeatureReport = (font: Font, unicodeSet: Set<number>) => {
    return FeatureList.reduce(
        (col, i) => {
            const arr = (font.substitution as any).getFeature(i);
            if (arr && arr.length) col[i] = arr;
            return col;
        },
        {} as Record<
            string,
            { sub: number | number[]; by: number | number[] }[]
        >,
    );
};
