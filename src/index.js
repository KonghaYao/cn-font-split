import Transaction from "@konghayao/promise-transaction";
import prepareCharset from "./prepareCharset.js";
import { nanoid } from "nanoid";
import formatBytes from "./utils/formatBytes.js";
import fse from "fs-extra";
import path from "path";
import CutTargetFont from "./CutTargetFont.js";
import { CutFont, ReadFontDetail } from "./utils/FontUtils.js";
// process.setMaxListeners(0)
export default async function ({
    FontPath,
    destFold = "./build",
    css: {
        fontFamily = "",
        fontWeight = "",
        fontStyle = "",
        fontDisplay = "",
    } = {},
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkOptions = {}, //
    charset = {},
    testHTML = true,
}) {
    charset = {
        SC: true, // 简体
        other: true, // 非中文及一些符号
        TC: false, // 繁体
        ...charset,
    };
    chunkOptions = {
        TC: 3,
        SC: 6,
        other: 1,
        ...chunkOptions,
    };
    const tra = new Transaction(
        [
            ["准备字符集", () => prepareCharset(charset)],
            [
                "读取字体",
                async () => {
                    let stat = fse.statSync(FontPath);
                    const file = await fse.readFile(FontPath);

                    const detail = ReadFontDetail(file);
                    console.log(detail.fontFamily, formatBytes(stat.size));
                    return { ...detail, ...stat, file };
                },
            ],
            [
                "校对和切割目标字体",
                (charMap) => {
                    return CutTargetFont(
                        charMap.get("读取字体"),
                        charMap.get("准备字符集"),
                        chunkOptions
                    );
                },
            ],
            [
                "开始切割分包",
                async (charMap) => {
                    charMap.delete("准备字符集");
                    const {
                        other = [],
                        SC = [],
                        TC = [],
                    } = charMap.get("校对和切割目标字体");
                    charMap.delete("校对和切割目标字体");
                    const { file } = charMap.get("读取字体");

                    const total = [...other, ...SC, ...TC];

                    process.setMaxListeners(total.length * 6);
                    const promises = total.map(async (subset, index) => {
                        const id = nanoid();
                        const font = await CutFont(file, subset, index);
                        const Path = path.join(destFold, id + ".woff2");
                        await fse.outputFile(Path, font);
                        console.log("生成文件:", id, formatBytes(font.length));
                        return { id, subset };
                    });
                    console.log("总分包数目：", total.length);
                    console.log("  已经开始分包了，请耐心等待。。。");
                    return Promise.all(promises);
                },
            ],
            [
                "生成 CSS 文件",
                async (charMap) => {
                    const IDCollection = charMap.get("开始切割分包");
                    const { fontFamily: ff } = charMap.get("读取字体");
                    const cssStyleSheet = IDCollection.map(({ id, subset }) => {
                        return `@font-face {
    font-family: ${fontFamily || ff};
    src: url("./${id}.woff2") format("woff2");
    font-style: ${fontStyle};
    font-weight: ${fontWeight};
    font-display: ${fontDisplay};
    unicode-range:${subset.map((i) => `U+${i.toString(16)}`).join(",")}
}`;
                    }).join("\n");
                    return fse.outputFile(
                        path.join(destFold, (cssFileName || "result") + ".css"),
                        cssStyleSheet
                    );
                },
            ],
            ["生成 Template.html 文件", () => {}],
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
