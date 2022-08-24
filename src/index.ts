import { Font, FontEditor, TTF } from "fonteditor-core";
import { initWoff2 } from "./utils/FontUtils";
import fs from "fs";
import { formatBytes, _formatBytes } from "./utils/formatBytes";
import { outputFile } from "fs-extra";
import crypto from "crypto";
import { createTestHTML } from "./createTestHTML";
import path from "path";
import chalk from "chalk";
import { chunk } from "lodash-es";
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

    testHTML?: boolean;
    chunkSize?: number;
};
import * as charList from "./charset/words.json";
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

    testHTML = true,
}: InputTemplate) {
    let fileSize: number;
    let font: FontEditor.Font;

    let glyf: TTF.Glyph[];
    let allChunk: TTF.Glyph[][];
    /* 准备保存的文件信息 */
    let buffers: { unicodes: number[]; buffer: Buffer }[];
    /** 每个 chunk 的信息，但是没有 chunk 的 buffer */
    let chunkMessage: {
        unicodes: number[];
        name: string;
        type: FontEditor.FontType;
        size: number;
    }[];
    let chunkCount = 0;
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
                console.log(
                    chalk.red(
                        "字体文件总大小 " + formatBytes(fileSize),
                        "总字符个数 " + font.get().glyf.length
                    )
                );
            },
        ],

        [
            "初始化字体生产插件",
            () => {
                if (targetType === "woff2") initWoff2();
            },
        ],
        [
            "排序字体图形",
            async () => {
                const list: number[] = (charList as any).default.flat();

                // 重新排序这个 glyf 数组
                glyf = [...font.get().glyf].sort((a, b) => {
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
            },
        ],
        [
            "构建分包",
            async () => {
                // 重新划分分包
                const singleCharBytes = fileSize / glyf.length;
                const singleChunkSize = Math.ceil(chunkSize / singleCharBytes);

                // 尝试分包大小
                const testSize = Math.floor(singleChunkSize / 3);
                const midStart = Math.floor(glyf.length / 2 - testSize / 2);
                const testChunk = new Set([
                    ...glyf.slice(midStart, midStart + testSize * 2),
                ]);
                const buffer = font
                    .readEmpty()
                    .set({
                        ...font.get(),
                        glyf: [...testChunk.values()],
                    })
                    .write({
                        type: targetType,
                        toBuffer: true,
                    }) as Buffer;
                console.log("测试分包大小", testChunk.size, buffer.length);
                allChunk = chunk(
                    glyf,
                    testChunk.size * (chunkSize / buffer.length)
                );
                console.log(
                    chalk.green(
                        Math.floor(singleCharBytes) + " B/个文件",
                        singleChunkSize + "个",
                        allChunk.length + "组"
                    )
                );
            },
        ],
        [
            "切割分包",
            async () => {
                console.log(chalk.red("切割环节时间较长，请稍等"));
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
                        console.log(
                            chalk.green(
                                chunkCount++,
                                content.slice(0, 10),
                                formatBytes(size)
                            )
                        );
                    });

                    return {
                        name: content,
                        type: targetType,
                        unicodes: i.unicodes,
                        size: i.buffer.length,
                    };
                });
                buffers = [];
            },
        ],
        [
            "生成 CSS 文件",
            async () => {
                const cssStyleSheet = chunkMessage
                    .map(({ name, unicodes }) => {
                        return `@font-face {
            font-family: ${fontFamily};
            src: url("./${name}.${targetType}");
            font-style: ${fontStyle};
            font-weight: ${fontWeight};
            font-display: ${fontDisplay};
            unicode-range:${unicodes
                .map((i) => `U+${i.toString(16).toUpperCase()}`)
                .join(",")}
        }`;
                    })
                    .join("\n");
                return outputFile(
                    path.join(destFold, (cssFileName || "result") + ".css"),
                    cssStyleSheet
                );
            },
        ],
        [
            "生成 html 文件",
            () => {
                if (testHTML) {
                    return createTestHTML({
                        fontFamily: fontFamily,
                        cssFileName,
                        destFold,
                    });
                }
            },
        ],
        [
            "生成 reporter 文件",
            () => {
                if (testHTML) {
                    const data = chunkMessage
                        .map((i) => {
                            return [
                                "ChunkName: " + i.name,
                                "ChunkSize: " + _formatBytes(i.size),
                                String.fromCharCode(...i.unicodes),
                            ].join("\n");
                        })
                        .join("\n\n");
                    outputFile(path.join(destFold, "./reporter.text"), data);
                }
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
