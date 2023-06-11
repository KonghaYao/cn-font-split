import { Subsets } from "../interface";

export const subsetsToSet = (subsets: Subsets) => {
    const set = new Set<number>();
    subsets.forEach((arr) => {
        arr.forEach((range) => {
            if (typeof range === "number") {
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
