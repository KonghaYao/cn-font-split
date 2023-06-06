import { FontType, convert } from "./font-converter.js";
import { WriteFileOptions, outputFile } from "fs-extra";
import { hbjs, HB } from "./hb.js";
import { Context, Executor } from "./pipeline/index.js";
import { loadHarbuzzAdapter } from "./adapter/loadHarfbuzz.js";
import { isBrowser, isNode } from "./utils/env.js";
import { subsetAll } from "./subset.js";
import path from "path";
export const TransFontsToTTF = (buffer: Buffer) => {
    return convert(buffer, "truetype");
};
export type WASMLoadOpt = Record<
    "harfbuzz",
    string | Response | (() => Promise<string | Response>)
>;
export type IOutputFile = (
    file: string,
    data: any,
    options?: string | WriteFileOptions | undefined
) => Promise<void>;

export type InputTemplate = {
    wasm?: Partial<WASMLoadOpt>;
    /** 字体文件的相对地址 */
    FontPath: string | ArrayBuffer;
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
    fontType?: FontType;
    /** 输出的字体类型，默认 ttf；woff，woff2 也可以*/
    targetType?: FontType;
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
    /** 日志输出<副作用> */
    log?: (...args: any[]) => void;
    /** 输出文件的方式 */
    outputFile?: IOutputFile;
};
export const fontSplit = async (opt: InputTemplate) => {
    const exec = new Executor(
        {
            async LoadFile(ctx) {
                const { input } = ctx.pick("input");
                let res: ArrayBuffer;
                const defaultFunc = async () => {
                    // 视为本地地址
                    res = await import("fs/promises").then((res) => {
                        return res.readFile(input.FontPath as string);
                    });
                };
                if (typeof input.FontPath === "string") {
                    if (isBrowser) {
                        ctx.info("environment: Browser");
                        // 视为 url

                        res = await fetch(input.FontPath).then((res) =>
                            res.arrayBuffer()
                        );
                    } else if (isNode) {
                        ctx.info("environment: Node");
                        await defaultFunc();
                    } else {
                        ctx.info(
                            "environment: Unknown (Guess Node;May encounter some bugs)"
                        );
                        await defaultFunc();
                    }
                } else {
                    // 视为二进制数据
                    res = input.FontPath;
                }
                ctx.set("originFile", new Uint8Array(res!));
            },
            async transferFontType(ctx) {
                const { input, originFile } = ctx.pick("input", "originFile");
                const ttfFile = await convert(originFile, "truetype");
                ctx.set("ttfFile", ttfFile);
            },
            async loadHarbuzz(ctx) {
                const { input } = ctx.pick("input");
                let loader = input.wasm?.harfbuzz;

                if (typeof loader === "function") {
                    loader = await loader();
                }
                let wasm = await loadHarbuzzAdapter(loader);
                ctx.set("hb", hbjs(wasm!.instance));
            },
            async subsetFonts(ctx) {
                const { input, hb, ttfFile } = ctx.pick(
                    "input",
                    "ttfFile",
                    "hb"
                );
                await subsetAll(
                    ttfFile,
                    hb,
                    [[[30, 100]], []],
                    async (filename, buffer) => {
                        return outputFile(
                            path.join(input.destFold, filename),
                            buffer
                        );
                    },
                    input.targetType ?? "woff2"
                );
            },
        },
        new Context<{
            input: InputTemplate;
            originFile: Uint8Array;
            ttfFile: Uint8Array;
            hb: HB.Handle;
        }>({ input: opt })
    );
    const ctx = await exec
        .defineOrder([
            "LoadFile",
            "transferFontType",
            "loadHarbuzz",
            "subsetFonts",
        ])
        .run();
};
