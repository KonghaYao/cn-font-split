export const foldLinearArray = (arr: number[]) => {
    const res = arr.reduce(
        (col, cur) => {
            const last = col[col.length - 1];
            if (typeof last === 'number') {
                if (last + 1 === cur) {
                    col.pop();
                    col.push([last, cur]);
                } else {
                    col.push(cur);
                }
            } else if (last instanceof Array && last[1] + 1 === cur) {
                last[1] = cur;
            } else {
                col.push(cur);
            }
            return col;
        },
        [] as (number | [number, number])[],
    );
    // console.log(res);
    return res;
};
