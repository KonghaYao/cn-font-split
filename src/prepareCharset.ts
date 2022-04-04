import { getUnicodeRangeArray } from "./utils/getUnicodeRange";
import words from "./charset/words.json";

// {
//     common: true, //简繁共有部分
//     SC: true, // 简体
//     other: true, // 非中文及一些符号
//     TC: true, // 繁体
//     ...charset,
// }

let { SC, TCDiff, symbol } = words;

const TC = TCDiff.split("")
    .filter((_, i) => i % 2)
    .join("");
export function prepareCharset(config: {
    SC?: boolean;
    TC?: boolean;
    other?: boolean;
}) {
    return {
        SC: config.SC ? SC : "",
        TC: config.TC ? TC : "",
        other: config.other ? symbol : "",
    };
}
