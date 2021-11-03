import fse from "fs-extra";
import { resolve } from "path";
import { difference, intersection } from "lodash-es";

// {
//     common: true, //简繁共有部分
//     SC: true, // 简体
//     other: true, // 非中文及一些符号
//     TC: true, // 繁体
//     ...charset,
// }
function loadTC() {
    let TC = fse
        .readFileSync(resolve("./src/charset/TCDiff.txt"), {
            encoding: "utf-8",
        })
        .split("")
        .filter((_, i) => !(i % 2));
    return TC;
}
export default function prepareCharset(config) {
    let charset = {
        SC: [],
        TC: [],
        other: [],
    };
    // 只要是 简体或者使用了 common 就先导入基本的文件
    if (config.SC) {
        charset.SC = fse
            .readFileSync(resolve("./src/charset/SC.txt"), {
                encoding: "utf-8",
            })
            .split("");
    }

    if (config.TC) {
        charset.TC = loadTC();
    }

    if (config.other) {
        charset.other = fse
            .readFileSync(resolve("./src/charset/symbol.txt"), {
                encoding: "utf-8",
            })
            .split("");
    }

    return charset;
}
