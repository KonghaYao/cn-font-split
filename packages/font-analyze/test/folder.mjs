/** 将数组中的数字，归并为 ([min,max]|[singleNum])[] */
const folder = (arr) => {
    return [...new Set(arr)]
        .sort((a, b) => a - b)
        .reduce(
            (col, cur) => {
                const lastArea = col[col.length - 1];

                if (lastArea.length === 0) {
                    lastArea.push(cur);
                } else if (lastArea[lastArea.length - 1] + 1 === cur) {
                    lastArea[1] = cur;
                } else {
                    col.push([cur]);
                }
                return col;
            },
            [[]],
        );
};
import fs from 'fs-extra';
let count = 0;
const i = fs.readFileSync('./gb12345-han.txt', 'utf-8');
const a = folder(i.split('\n').map((i) => i.codePointAt(0)));

fs.outputJSONSync('./gb12345.json', a);
