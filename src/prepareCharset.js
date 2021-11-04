import fse from "fs-extra";
import __dirname from "./__dirname.js";
import { resolve } from "path";
import { getUnicodeRangeArray } from "./utils/getUnicodeRange.js";
// {
//     common: true, //简繁共有部分
//     SC: true, // 简体
//     other: true, // 非中文及一些符号
//     TC: true, // 繁体
//     ...charset,
// }
function loadTC() {
    let TC = fse
        .readFileSync(resolve(__dirname, "./charset/TCDiff.txt"), {
            encoding: "utf-8",
        })
        .split("")
        .filter((_, i) => i % 2)
        .join("");
    return TC;
}
export default function prepareCharset(config) {
    let charset = {
        SC: "",
        TC: "",
        other: "",
    };
    // 只要是 简体或者使用了 common 就先导入基本的文件
    if (config.SC) {
        charset.SC = fse.readFileSync(resolve(__dirname, "./charset/SC.txt"), {
            encoding: "utf-8",
        });
    }

    if (config.TC) {
        charset.TC = loadTC();
    }

    if (config.other) {
        charset.other = fse.readFileSync(
            resolve(__dirname, "./charset/symbol.txt"),
            {
                encoding: "utf-8",
            }
        );
    }

    return {
        SC: getUnicodeRangeArray(charset.SC),
        TC: getUnicodeRangeArray(charset.TC),
        other: getUnicodeRangeArray(charset.other),
    };
}
