import { FontEditor, TTF, woff2 } from "fonteditor-core";
import { prepareCharset } from "./prepareCharset";
import { initWoff2, ReadFontDetail } from "./utils/FontUtils";
import fs from "fs";
import { formatBytes } from "./utils/formatBytes";
import format from "pretty-format";
import { ResultDetail } from "./genFontFile";
import { CutTargetFont } from "./CutTargetFont";
import { outputFile } from "fs-extra";
import { Pool, spawn, Thread, Transfer, Worker } from "threads";

import codePoint from "code-point";
import { createTestHTML } from "./createTestHTML";
import path from "path";
type InputTemplate = {
    FontPath: string;
    destFold: string;
    css: Partial<{
        fontFamily: string;
        fontWeight: number;
        fontStyle: string;
        fontDisplay: string;
    }>;
    fontType: FontEditor.FontType;
    cssFileName: string;
    /** 字体分包数目 */
    chunkOptions: {
        /** 中文繁体分包数目 */
        TC?: number;
        /** 中文简体分包数目 */
        SC?: number;
        /** 其他分包数目 */
        other?: number;
    };
    charset: {
        /** 简体 */
        SC?: boolean; // 简体
        other?: boolean; // 非中文及一些符号
        /** 中文繁体分包数目 */
        TC?: boolean; // 繁体
    };
    testHTML: boolean;
};

export = async function ({
    FontPath,
    destFold = "./build",
    css: {
        fontFamily = "",
        fontWeight = 400,
        fontStyle = "normal",
        fontDisplay = "swap",
    } = {},
    fontType = "ttf",
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkOptions = {}, //
    charset = {},
    testHTML = true,
}: InputTemplate) {
    charset = {
        SC: true,
        other: true,
        TC: true,
        ...charset,
    };
    chunkOptions = {
        TC: 3,
        SC: 6,
        other: 1,
        ...chunkOptions,
    };
    const G = {} as Partial<
        {
            font: FontEditor.Font;
            Charset: ReturnType<typeof prepareCharset>;
            fontSlices: { [k: string]: string[][] };
            file: Buffer;
            IDCollection: ResultDetail[];
        } & TTF.Name
    >;
    const tra = [
        [
            "准备字符集",
            async () => {
                const Charset = await prepareCharset(charset);
                Object.assign(G, { Charset });
            },
        ],
        ["准备 woff2", () => initWoff2()],
        [
            "读取字体",
            async () => {
                const file = fs.readFileSync(FontPath);

                Object.assign(G, { file });
            },
        ],
        [
            "校对和切割目标字体",
            async () => {
                const fontSlices = await CutTargetFont(
                    G.Charset!,
                    chunkOptions
                );
                Object.assign(G, { fontSlices });
            },
        ],
        [
            "切割分包",
            async () => {
                Object.assign(G, { Charset: null });
                const { other = [], SC = [], TC = [] } = G.fontSlices!;
                const file = G.file!;
                const total = [...other, ...SC, ...TC];

                process.setMaxListeners(total.length * 6);
                console.log("总分包数目：", total.length);
                console.log("  已经开始分包了，请耐心等待。。。");
                const pool = Pool(
                    () => spawn(new Worker("./worker/genFontFile")),
                    4
                );
                console.time("切割总耗时");
                const IDCollection: ResultDetail[] = [];
                total.forEach((subset, index) => {
                    pool.queue(async (genFontFile) => {
                        const label =
                            "分包情况: " +
                            index +
                            " | 分字符集大小 | " +
                            subset.length;
                        console.time(label);
                        const result = genFontFile(
                            file.buffer,
                            subset,
                            destFold,
                            fontType
                        );
                        console.timeEnd(label);
                        return result;
                    }).then((result: ResultDetail) => {
                        console.log(
                            "生成文件:",
                            index,
                            result.id,
                            formatBytes(result.size)
                        );
                        IDCollection.push(result);
                    });
                });
                await pool.completed();

                await pool.terminate();
                Object.assign(G, { IDCollection });
                console.timeEnd("切割总耗时");
                return;
            },
        ],
        [
            "生成 CSS 文件",
            async () => {
                const IDCollection = G.IDCollection!;
                const ff = fontFamily;
                const cssStyleSheet = IDCollection.map(({ id, subset }) => {
                    return `@font-face {
            font-family: ${fontFamily || ff};
            src: url("./${id}.woff2") format("woff2");
            font-style: ${fontStyle};
            font-weight: ${fontWeight};
            font-display: ${fontDisplay};
            unicode-range:${subset
                .map((i) => `U+${codePoint(i).toString(16)}`)
                .join(",")}
        }`;
                }).join("\n");
                return outputFile(
                    path.join(destFold, (cssFileName || "result") + ".css"),
                    cssStyleSheet
                );
            },
        ],
        [
            "生成 Template.html 文件",
            () => {
                if (testHTML) {
                    const ff = fontFamily;

                    return createTestHTML({
                        fontFamily: fontFamily || ff,
                        cssFileName,
                        destFold,
                    });
                }
            },
        ],
    ] as [string, Function][];

    return tra.reduce((col, [name, func]) => {
        return col
            .then(() => {
                console.time(name);
                return func();
            })
            .then(() => {
                console.timeEnd(name);
            });
    }, Promise.resolve());
};
