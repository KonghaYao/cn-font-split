/** 优先数组出现在前面，后面紧接其余的数字 */
export const resortByRank = (origin: number[], rank: number[] = []) => {
    if (rank.length === 0) return origin;
    const init = rank.filter((i) => origin.includes(i));

    const total = [...init, ...origin];

    return total.filter((it, index, self) => {
        return self.indexOf(it) === index;
    });
};
