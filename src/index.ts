import { Font, FontEditor, TTF } from "fonteditor-core";
import { initWoff2 } from "./utils/FontUtils";
import { formatBytes, _formatBytes } from "./utils/formatBytes";
import fse from "fs-extra";
import { createTestHTML } from "./createTestHTML";
import path from "path";
import chalk from "chalk";

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
    /** 是否输出预览图 */
    previewImage?: {
        /** 图中需要显示的文本 */
        text?: string;
        /** 预览图的文件名，不用带后缀名 */
        name?: string;
    };
    /** 日志输出 */
    log?: (...args: any[]) => void;
    /** 输出文件的方式 */
    outputFile?: (
        file: string,
        data: any,
        options?: string | fse.WriteFileOptions | undefined
    ) => Promise<void>;
};
import * as charList from "./charset/words.json";
import { md5 } from "./utils/md5";
import { defaultLog, defaultOutputFile } from "./default";
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
    previewImage,
    log = defaultLog,
    outputFile = defaultOutputFile,
}: InputTemplate) {
    // testHTML 必须要 reporter 进行支持
    if (testHTML) reporter = true;

    /** 格式化 字体类型 */
    fontType =
        fontType || (path.extname(FontPath).slice(1).toLowerCase() as any);

    /** record 是记录时间信息的字段 */
    const record: {
        name: string;
        start: number;
        end: number;
    }[] = [];
    log("输入文件类型识别", fontType);
    let fileSize: number;
    let font: FontEditor.Font;
    /** 字体的作者，名称等信息对象 */
    let fontData: TTF.Name;

    /** 字符集 */
    let glyf: TTF.Glyph[];
    /** 第一个字符是空字符，必须以这个为开头 */
    let voidGlyf: TTF.Glyph;

    let allChunk: TTF.Glyph[][];
    let _config: TTF.TTFObject;
    /**  准备保存的文件信息 */
    let buffers: { unicodes: number[]; buffer: Buffer }[];
    /** 每个 chunk 的信息，但是没有 chunk 的 buffer */
    let chunkMessage: {
        unicodes: number[];
        name: string;
        type: FontEditor.FontType;
        size: number;
    }[];
    let fileBuffer: Buffer;
    const tra = [
        [
            "初始化字体生产插件",
            async () => {
                if (
                    targetType === "woff2" ||
                    fontType === "woff2" ||
                    targetType === "woff" ||
                    fontType === "woff"
                ) {
                    if ((globalThis as any).fetch)
                        console.warn(
                            "警告： 全局变量中包含 fetch 可能发生错误！！！"
                        );
                    await initWoff2();
                }
            },
        ],
        [
            "读取字体",
            async () => {
                log("读取字体中");
                fileBuffer = await fse.readFile(FontPath);
                fileSize = fileBuffer.length;
            },
        ],

        [
            "载入字体",
            async () => {
                font = Font.create(fileBuffer, {
                    type: fontType!, // support ttf, woff, woff2, eot, otf, svg
                    hinting: true, // save font hinting
                    compound2simple: true, // 这个选项可以避免下面的复合字符错误
                    combinePath: false, // for svg path
                });

                const fontFile = font.get();

                // process.abort();
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

                log(
                    chalk.red(
                        "字体文件总大小 " + formatBytes(fileSize),
                        "总字符个数 " + fontFile.glyf.length
                    )
                );
            },
        ],
        previewImage && [
            "生成预览图",
            async () => {
                // 创建预览图
                // 动态载入绘图库，以免绘图不行，直接 BUG 退出
                const { createImageForFont } = await import(
                    "@konghayao/image-text"
                );
                await createImageForFont(fileBuffer, fontType!, destFold, {
                    ...previewImage,
                    outputFile,
                });
            },
        ],
        [
            "排序字体图形",
            async () => {
                /**@ts-ignore */
                fileBuffer = null;
                const list: number[] = (charList as any).default.flat();

                _config = JSON.parse(JSON.stringify(font.get()));
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
                // 算法为计算单个轮廓的大小，计算完成之后进行遍历统计，累计数达到指定大小时进行隔断分包
                const glfyLength = font
                    .get()
                    .glyf.reduce(
                        (col, res) =>
                            col + (res.contours ? res.contours.length : 0),
                        0
                    );
                const oneContourCount = (chunkSize * glfyLength) / fileSize;
                let counter = 0;
                allChunk = glyf.reduce(
                    (col, cur) => {
                        if (counter >= oneContourCount) {
                            col.push([cur]);
                            counter = 0;
                        } else {
                            const last = col[col.length - 1];
                            last.push(cur);
                        }
                        counter += cur.contours ? cur.contours.length : 0;
                        return col;
                    },
                    [[]] as TTF.Glyph[][]
                );
            },
        ],
        [
            "切割分包",
            async () => {
                log(chalk.red("切割环节时间较长，请稍等"));
                let errorCount = 0;
                buffers = allChunk.map((g) => {
                    const glyf = [
                        voidGlyf,
                        ...g.filter((i) => {
                            // ! 一级 BUG： 当 i.contours 不存在时，会导致打包结果错误
                            // ! fonteditor-core 认为不存在时为复合字符，需要 compound2simple
                            if (!(i.contours instanceof Array)) {
                                errorCount++;
                                // console.log(i);
                                return false;
                            }
                            return true;
                        }),
                    ];

                    const config = {
                        ..._config,
                        // fixed: 好像 glyf 的第一个值是空值
                        glyf,
                    };

                    const buffer = font.readEmpty().set(config).write({
                        type: targetType,
                        toBuffer: true,
                    }) as Buffer;
                    return {
                        unicodes: [
                            ...new Set(
                                config.glyf.flatMap((i) => i.unicode || [])
                            ),
                        ],
                        buffer,
                    };
                });
                errorCount && log(chalk.red("因错误忽略字符数：", errorCount));

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
                    outputFile(file, i.buffer).then(() => {
                        log(
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
                return outputFile(
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
                        outputFile,
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
                    return outputFile(
                        path.join(destFold, "./reporter.json"),
                        JSON.stringify({
                            config: arguments[0],
                            message: fontData,
                            data,
                            record,
                        })
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
    return tra
        .filter((i) => i)
        .reduce((col, [name, func]) => {
            return col
                .then((last) => {
                    temp_stage = { name, start: Date.now(), end: 0 };
                    record.push(temp_stage);
                    console.time(chalk.blue(name));
                    return func(last);
                })
                .then(() => {
                    console.timeEnd(chalk.blue(name));
                    temp_stage.end = Date.now();
                });
        }, Promise.resolve());
}
export { fontSplit };
export default fontSplit;
