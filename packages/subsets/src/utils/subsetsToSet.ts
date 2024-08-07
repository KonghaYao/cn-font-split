import { Subsets } from '../interface';

/** 提取 subsets 中的 unicode 数字到 Set 中*/
export const subsetsToSet = (subsets: Subsets, set = new Set<number>()) => {
    subsets.forEach((arr) => {
        arr.forEach((range) => {
            if (typeof range === 'number') {
                set.add(range);
            } else {
                const [start, end] = range;
                for (let index = start; index <= end; index++) {
                    set.add(index);
                }
            }
        });
    });
    return set;
};
