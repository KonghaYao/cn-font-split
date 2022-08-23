import { Font, FontEditor, TTF } from "fonteditor-core";
import { prepareCharset } from "./prepareCharset";
import { initWoff2 } from "./utils/FontUtils";
import fs from "fs";
import { formatBytes } from "./utils/formatBytes";
import { ResultDetail } from "./genFontFile";
import { CutTargetFont } from "./CutTargetFont";
import { outputFile } from "fs-extra";
import { Pool, spawn, Worker } from "threads";
import crypto from "crypto";
import codePoint from "code-point";
import { createTestHTML } from "./createTestHTML";
import path, { resolve } from "path";
import chalk from "chalk";
import { chunk, pick } from "lodash-es";
type InputTemplate = {
    FontPath: string;
    destFold: string;
    css?: Partial<{
        fontFamily: string;
        fontWeight: number;
        fontStyle: string;
        fontDisplay: string;
    }>;
    fontType?: FontEditor.FontType;
    targetType?: FontEditor.FontType;
    cssFileName?: string;

    charset?: {
        /** 简体 */
        SC?: boolean; // 简体
        symbol?: boolean; // 非中文及一些符号
        /** 中文繁体分包数目 */
        TC?: boolean; // 繁体
    };
    testHTML?: boolean;
    chunkSize?: number;
};
import charList from "./charset/words.json";
async function fontSplit({
    FontPath,
    destFold = "./build",
    css: {
        fontFamily = "",
        fontWeight = 400,
        fontStyle = "normal",
        fontDisplay = "swap",
    } = {},
    fontType = "ttf",
    targetType = "ttf",
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkSize = 200 * 1024,
    charset = {},
    testHTML = true,
}: InputTemplate) {
    charset = {
        SC: true,
        symbol: true,
        TC: true,
        ...charset,
    };

    let fileSize: number;
    let font: FontEditor.Font;
    let allChunk: TTF.Glyph[][];
    let buffers: { unicodes: number[]; buffer: Buffer }[];
    /** 每个 chunk 的信息，但是没有 chunk 的 buffer */
    let chunkMessage: {
        unicodes: number[];
        name: string;
        type: FontEditor.FontType;
    }[];
    const tra = [
        [
            "载入字体",
            async () => {
                const fileBuffer = fs.readFileSync(FontPath);
                fileSize = fileBuffer.length;
                font = Font.create(fileBuffer, {
                    type: fontType, // support ttf, woff, woff2, eot, otf, svg
                    hinting: true, // save font hinting
                    compound2simple: false, // transform ttf compound glyf to simple
                    combinePath: false, // for svg path
                });
                chalk.red(
                    "字体文件总大小 " + formatBytes(fileSize),
                    "总字符个数 " + font.get().glyf.length
                );
            },
        ],
        ["准备 woff2", () => initWoff2()],
        [
            "排序、重构文件",
            async () => {
                const list = charList as any as number[];

                // 重新排序这个 glyf 数组
                const data = [...font.get().glyf].sort((a, b) => {
                    const indexA: number = a?.unicode?.length
                        ? list.indexOf(a.unicode[0])
                        : -1;
                    const indexB: number = b?.unicode?.length
                        ? list.indexOf(b.unicode[0])
                        : -1;
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                });

                // 重新划分分包
                const singleCharBytes = fileSize / data.length;
                const singleChunkSize = Math.ceil(chunkSize / singleCharBytes);
                allChunk = chunk(data, singleChunkSize);

                chalk.green(
                    Math.floor(singleCharBytes) + "B ",
                    singleChunkSize + "个",
                    allChunk.length + "组"
                );
            },
        ],
        [
            "切割分包",
            async () => {
                buffers = allChunk.map((glyf) => {
                    const buffer = font
                        .readEmpty()
                        .set({
                            ...font.get(),
                            glyf,
                        })
                        .write({
                            type: targetType,
                            toBuffer: true,
                        }) as Buffer;
                    return {
                        unicodes: glyf.flatMap((i) => i.unicode || []),
                        buffer,
                    };
                });

                allChunk.length = 0;
            },
        ],
        [
            "整合并写入数据",
            async () => {
                chunkMessage = buffers.map((i) => {
                    let sf = crypto.createHash("md5");
                    // 对字符串进行加密
                    sf.update(i.buffer);
                    // 加密的二进制数据以字符串形式返回
                    let content = sf.digest("hex");
                    const file = path.join(
                        destFold,
                        `${content}.${targetType}`
                    );
                    const size = i.buffer.length;
                    fs.writeFile(file, i.buffer, () => {
                        chalk.green("build", file, formatBytes(size));
                    });

                    return {
                        name: content,
                        type: targetType,
                        unicodes: i.unicodes,
                    };
                });
            },
        ],
    ] as [string, Function][];

    return tra.reduce((col, [name, func]) => {
        return col
            .then(() => {
                console.time(chalk.blue(name));
                return func();
            })
            .then(() => {
                console.timeEnd(chalk.blue(name));
            });
    }, Promise.resolve());
}
export { fontSplit };
export default fontSplit;
