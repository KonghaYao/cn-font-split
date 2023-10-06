import type { Subset } from '../interface';

/** subset 由数字模式转化为字符串模式 */
export const subsetToUnicodeRange = (subset: Subset) => {
    return subset
        .reduce((col, cur) => {
            if (typeof cur === 'number') {
                col.push('U+' + cur.toString(16));
            } else {
                col.push(`U+${cur[0].toString(16)}-${cur[1].toString(16)}`);
            }
            return col;
        }, [] as string[])
        .join(',');
};
