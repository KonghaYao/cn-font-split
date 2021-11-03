import Transaction from "@konghayao/promise-transaction";
import prepareCharset from "./prepareCharset.js";
import { chunk } from "lodash-es";
import genFontFile from "./genFontFile.js";
import fse from "fs-extra";
import path from "path";
export default async function ({
    FontPath,
    destFold = "./build",
    css = {},
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkOptions = {}, //
    charset = {},
}) {
    charset = {
        common: true, //简繁共有部分
        SC: true, // 简体
        other: true, // 非中文及一些符号
        TC: false, // 繁体
        ...charset,
    };
    chunkOptions = {
        TC: 10,
        SC: 10,
        other: 2,
        ...chunkOptions,
    };
    const tra = new Transaction(
        [
            ["准备字符集", () => prepareCharset(charset)],
            [
                "异步切割字符集",
                (charMap) => {
                    const { other, SC, TC } = charMap.get("准备字符集");
                    charMap.delete("准备字符集");

                    return {
                        other: chunk(
                            other,
                            Math.ceil(other.length / chunkOptions.other)
                        ),
                        SC: chunk(SC, Math.ceil(SC.length / chunkOptions.SC)),
                        TC: chunk(TC, Math.ceil(TC.length / chunkOptions.TC)),
                    };
                },
            ],
            [
                "生成 CSS 文件和 test 测试文件",
                async (charMap) => {
                    const { other, SC, TC } = charMap.get("异步切割字符集");
                    console.log(other.length, SC.length, TC.length);
                    charMap.delete("异步切割字符集");
                    const promises = [other, SC, TC].map((i) =>
                        Promise.all(
                            i.map((charset) =>
                                genFontFile({
                                    text: charset.join(""),
                                    FontPath,
                                    css,
                                })
                            )
                        )
                    );
                    return Promise.all(promises);
                },
            ],
            [
                "输出文件",
                async (charMap) => {
                    const fileArray = charMap
                        .get("生成 CSS 文件和 test 测试文件")
                        .flat();
                    charMap.delete("生成 CSS 文件和 test 测试文件");
                    console.log("css 生成中");
                    const fontFamily = fileArray[0].fontFamily;
                    const cssFile = await fileArray.reduce(
                        async (promise, { file, style, fileName }) => {
                            await fse.outputFile(
                                path.join(destFold, fileName + ".ttf"),
                                file._contents
                            );
                            return promise.then((col) => col + style);
                        },
                        Promise.resolve("")
                    );
                    await fse.outputFile(
                        path.join(destFold, `${cssFileName}.css`),
                        cssFile
                    );
                    console.log("全部完成");
                    return {
                        fontFamily,
                    };
                },
            ],
        ]
            .map((i) => {
                return [
                    ["start" + i[0], () => console.time(i[0])],
                    i,
                    ["end" + i[0], () => console.timeEnd(i[0])],
                ];
            })
            .flat()
    );
    return tra.run();
}
