/** 将数组中的数字，归并为 ([min,max]|[singleNum])[] */
const folder = (arr) => {
    return [...arr]
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
            [[]]
        );
};
import fs from "fs-extra";
import { i } from "./b.mjs";
let count = 0;
const a = folder(i);

fs.outputJSONSync("./gb2312.json", a);
