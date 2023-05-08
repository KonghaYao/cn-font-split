import { Font, FontEditor, TTF } from "fonteditor-core";
import { initWoff2 } from "./utils/FontUtils";
import { formatBytes, _formatBytes } from "./utils/formatBytes";
import fse from "fs-extra";
import { createTestHTML } from "./createTestHTML";
import path from "path";
import chalk from "chalk";
import { chunk } from "lodash-es";
export type InputTemplate = {
    /** 字体文件的相对地址 */
    FontPath: string;
    /** 切割后字体 */
    destFold: string;
    /** 生成后的 CSS 文件的信息 */
    css?: Partial<{
        fontFamily: string;
        fontWeight: number | string;
        fontStyle: string;
        fontDisplay: string;
    }>;
    /** 输入的字体类型 */
    fontType?: FontEditor.FontType;
    /** 输出的字体类型，默认 ttf；woff，woff2 也可以*/
    targetType?: FontEditor.FontType;
    /** 预计每个包的大小，插件会尽量打包到这个大小  */
    chunkSize?: number;
    /** 输出的 css 文件的名称  */
    cssFileName?: string;

    /** 是否输出 HTML 测试文件  */
    testHTML?: boolean;
    /** 是否输出报告文件  */
    reporter?: boolean;
};
import * as charList from "./charset/words.json";
import { md5 } from "./utils/md5";
async function fontSplit({
    FontPath,
    destFold = "./build",
    css = {},
    fontType,
    targetType = "ttf",
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkSize = 200 * 1024,
    testHTML = true,
    reporter = true,
}: InputTemplate) {
    // testHTML 必须要 reporter 进行支持
    if (testHTML) reporter = true;
    fontType =
        fontType || (path.extname(FontPath).slice(1).toLowerCase() as any);
    /** record 是记录时间信息的字段 */
    const record: {
        name: string;
        start: number;
        end: number;
    }[] = [];
    console.log("输入文件类型识别", fontType);
    let fileSize: number;
    let font: FontEditor.Font;
    /** 字体的作者，名称等信息对象 */
    let fontData: TTF.Name;

    /** 字符集 */
    let glyf: TTF.Glyph[];
    /** 第一个字符是空字符，必须以这个为开头 */
    let voidGlyf: TTF.Glyph;

    let allChunk: TTF.Glyph[][];
    /**  准备保存的文件信息 */
    let buffers: { unicodes: number[]; buffer: Buffer }[];
    /** 每个 chunk 的信息，但是没有 chunk 的 buffer */
    let chunkMessage: {
        unicodes: number[];
        name: string;
        type: FontEditor.FontType;
        size: number;
    }[];

    const tra = [
        [
            "初始化字体生产插件",
            () => {
                if (
                    targetType === "woff2" ||
                    fontType === "woff2" ||
                    targetType === "woff" ||
                    fontType === "woff"
                )
                    return initWoff2();
            },
        ],
        [
            "载入字体",
            async () => {
                console.log("读取字体中");
                const fileBuffer = fse.readFileSync(FontPath);
                fileSize = fileBuffer.length;
                font = Font.create(fileBuffer, {
                    type: fontType!, // support ttf, woff, woff2, eot, otf, svg
                    hinting: true, // save font hinting
                    compound2simple: true, // transform ttf compound glyf to simple
                    combinePath: false, // for svg path
                });
                const fontFile = font.get();
                fontData = fontFile.name;
                css.fontFamily =
                    css.fontFamily || fontFile.name.fontFamily.trim();
                css.fontWeight = fontFile.name.fontSubFamily.toLowerCase();
                console.table(
                    // 只输出简单结果即可
                    Object.fromEntries(
                        Object.entries(fontFile.name).map((i) => {
                            return [
                                i[0],
                                i[1].length > 50
                                    ? i[1].slice(0, 50) + "..."
                                    : i[1],
                            ];
                        })
                    )
                );
                console.log(
                    chalk.red(
                        "字体文件总大小 " + formatBytes(fileSize),
                        "总字符个数 " + fontFile.glyf.length
                    )
                );
            },
        ],

        [
            "排序字体图形",
            async () => {
                const list: number[] = (charList as any).default.flat();

                // 重新排序这个 glyf 数组
                voidGlyf = font.get().glyf[0];
                glyf = font
                    .get()
                    .glyf.slice(1)
                    .sort((a, b) => {
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
                const testSize = Math.ceil(chunkSize / singleCharBytes);

                // 尝试分包大小
                const midStart = Math.floor(glyf.length / 2 - testSize / 2);
                const testChunk = new Set(
                    glyf.slice(midStart, midStart + testSize)
                );
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
                const singleSize = testChunk.size * (chunkSize / buffer.length);
                allChunk = chunk(glyf, singleSize);
            },
        ],
        [
            "切割分包",
            async () => {
                console.log(chalk.red("切割环节时间较长，请稍等"));

                buffers = allChunk.map((g) => {
                    const config = {
                        ...font.get(),
                        // fixed: 好像 glyf 的第一个值是空值
                        glyf: [voidGlyf, ...g],
                    };

                    const buffer = font.readEmpty().set(config).write({
                        type: targetType,
                        toBuffer: true,
                    }) as Buffer;
                    return {
                        unicodes: [
                            ...new Set(g.flatMap((i) => i.unicode || [])),
                        ],
                        buffer,
                    };
                });

                font = null as any; // 抹除对象先
                allChunk.length = 0;
            },
        ],
        [
            "整合并写入数据",
            async () => {
                chunkMessage = buffers.map((i, index) => {
                    let content = md5(i.buffer);
                    const file = path.join(
                        destFold,
                        `${content}.${targetType}`
                    );
                    const size = i.buffer.length;
                    fse.writeFile(file, i.buffer, () => {
                        console.log(
                            chalk.green(
                                index,
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
                        if (unicodes.length === 0) return "";
                        return `@font-face {
            font-family: "${css.fontFamily}";
            src: url("./${name}.${targetType}");
            font-style: ${css.fontStyle || "normal"};
            font-weight: ${
                css.fontWeight || fontData.fontSubFamily.toLowerCase()
            };
            font-display: ${css.fontDisplay || "swap"};
            unicode-range:${unicodes
                .map((i) => `U+${i.toString(16).toUpperCase()}`)
                .join(",")};
        }`;
                    })
                    .join("\n");
                const header =
                    "/*\n" +
                    Object.entries(fontData)
                        .map((i) => i.join(": "))
                        .join("\n") +
                    "\n */\n\n";
                return fse.outputFile(
                    path.join(destFold, (cssFileName || "result") + ".css"),
                    header + cssStyleSheet
                );
            },
        ],
        [
            "生成 html 文件",
            () => {
                if (testHTML) {
                    return createTestHTML({
                        destFold,
                    });
                }
            },
        ],
        [
            "生成 reporter 文件",
            async () => {
                if (reporter) {
                    const data = chunkMessage.map((i) => {
                        return {
                            name: i.name,
                            size: i.size,
                            chars: String.fromCharCode(...i.unicodes),
                        };
                    });
                    return fse.outputJSON(
                        path.join(destFold, "./reporter.json"),
                        {
                            config: arguments[0],
                            message: fontData,
                            data,
                            record,
                        }
                    );
                }
            },
        ],
    ] as [string, Function][];

    let temp_stage = {
        name: "",
        start: 0,
        end: 0,
    };
    return tra.reduce((col, [name, func]) => {
        return col
            .then(() => {
                temp_stage = { name, start: Date.now(), end: 0 };
                record.push(temp_stage);
                console.time(chalk.blue(name));
                return func();
            })
            .then(() => {
                console.timeEnd(chalk.blue(name));
                temp_stage.end = Date.now();
            });
    }, Promise.resolve());
}
export { fontSplit };
export default fontSplit;
