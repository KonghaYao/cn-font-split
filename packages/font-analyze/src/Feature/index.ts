import { Font } from '@konghayao/opentype.js';
import { FeatureList } from './FeatureList';

/** Opentype 的 feature 报告 */
export const getFeatureReport = (font: Font, unicodeSet: Set<number>) => {
    return FeatureList.reduce(
        (col, i) => {
            const arr: { sub: number | number[]; by: number | number[] }[] = (
                font.substitution as any
            ).getFeature(i);
            const idToUnicode = (id: number) => font.glyphs.get(id).unicodes;
            if (arr && arr.length)
                col[i] = arr.map((i) => {
                    return {
                        sub: (typeof i.sub === 'number' ? [i.sub] : i.sub).map(
                            (i) => idToUnicode(i),
                        ),
                        by: (typeof i.by === 'number' ? [i.by] : i.by).map(
                            (i) => idToUnicode(i),
                        ),
                    };
                });
            return col;
        },
        {} as Record<string, { sub: number[][]; by: number[][] }[]>,
    );
};
