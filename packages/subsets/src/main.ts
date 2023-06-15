import { convert } from "./font-converter.js";
import { outputFile } from "fs-extra";
import { hbjs } from "./hb.js";
import { Executor } from "./pipeline/index.js";
import { loadHarbuzzAdapter } from "./adapter/loadHarfbuzz.js";
import { isBrowser, isNode } from "./utils/env.js";
import { subsetAll } from "./subset.js";
import { createContext } from "./fontSplit/context.js";
import path from "path";
import byteSize from "byte-size";
import { InputTemplate } from "./interface.js";
import { decodeNameTableFromUint8Array } from "./reader/decodeNameTableFromUint8Array.js";
import { createReporter } from "./templates/reporter.js";
import { createCSS } from "./templates/css.js";
import { subsetsToSet } from "./utils/subsetsToSet.js";
import { autoSubset } from "./autoSubset.js";
import { Latin, getCN_SC_Rank } from "./ranks/index";

export const fontSplit = async (opt: InputTemplate) => {
    const exec = new Executor(
        [
            async function LoadFile(ctx) {
                const { input } = ctx.pick("input");
                let res!: ArrayBuffer;
                const defaultFunc = async () => {
                    // 视为本地地址
                    res = await import("fs/promises").then((res) => {
                        return res.readFile(input.FontPath as string);
                    });
                };
                if (typeof input.FontPath === "string") {
                    if (isBrowser) {
                        ctx.trace("Runtime Detect: Browser");
                        // 视为 url
                        res = await fetch(input.FontPath).then((res) =>
                            res.arrayBuffer()
                        );
                    } else if (isNode) {
                        ctx.trace("Runtime Detect: Node");
                        await defaultFunc();
                    } else {
                        ctx.trace(
                            "Runtime Detect: Unknown (Guess Node;May encounter some bugs)"
                        );
                        await defaultFunc();
                    }
                } else {
                    // 视为二进制数据
                    res = input.FontPath;
                }
                ctx.trace("输入文件大小：" + byteSize(res.byteLength));
                ctx.set("originFile", new Uint8Array(res));
            },
            async function transferFontType(ctx) {
                const { input, originFile } = ctx.pick("input", "originFile");

                const ttfFile = await convert(originFile, "truetype");
                ctx.set("ttfFile", ttfFile);
                ctx.free("originFile");
            },
            async function createImage(ctx) {
                const { ttfFile, input } = ctx.pick("ttfFile", "input");
                if (input.previewImage) {
                    const { Image } = await import("imagescript");
                    const Font = await Image.renderText(
                        ttfFile,
                        128,
                        input.previewImage?.text ??
                            "中文网字计划\nThe Project For Web"
                    );
                    const encoded = await Font.encode(
                        input.previewImage.compressLevel ?? 9,
                        {
                            creationTime: Date.now(),
                            software: "cn-font-split",
                            author: "江夏尧",
                            description: "cn-font-split 切割字体预览图",
                        }
                    );
                    await outputFile(
                        path.join(input.destFold, "preview" + ".png"),
                        encoded
                    );
                }
            },

            async function loadHarbuzz(ctx) {
                const { input, ttfFile } = ctx.pick("input", "ttfFile");
                let loader = input.wasm?.harfbuzz;

                if (typeof loader === "function") {
                    loader = await loader();
                }
                let wasm = await loadHarbuzzAdapter(loader);
                const hb = hbjs(wasm!.instance);
                const blob = hb.createBlob(ttfFile);

                const face = hb.createFace(blob, 0);
                blob.destroy();
                ctx.set("hb", hb);
                ctx.set("face", face);
                ctx.set("blob", blob);
                ctx.free("ttfFile");
            },
            async function getBasicMessage(ctx) {
                const { face } = ctx.pick("face");
                const buffer = face.reference_table("name");
                const nameTable = decodeNameTableFromUint8Array(buffer!);
                console.table(nameTable);
                ctx.set("nameTable", nameTable);
            },

            async function subsetFonts(ctx) {
                const { input, hb, face } = ctx.pick(
                    "input",
                    "face",
                    "hb",
                    "blob"
                );

                const subsetResult = await subsetAll(
                    face,
                    hb,
                    opt.subsets ?? [],
                    async (filename, buffer) => {
                        return outputFile(
                            path.join(input.destFold, filename),
                            buffer
                        );
                    },
                    input.targetType ?? "woff2",
                    ctx
                );
                ctx.set("subsetResult", subsetResult);
            },
            async function useAutoSubsets(ctx) {
                const { input, face, blob, subsetResult, hb } = ctx.pick(
                    "input",
                    "face",
                    "blob",
                    "hb",
                    "subsetResult"
                );

                const bundleChars = subsetsToSet(
                    subsetResult.map((i) => i.subset)
                );

                const totalChars = face.collectUnicodes();
                ctx.trace("总字符数", totalChars.length);

                // subsets 分割结果和总字符做 set 减法得到未分割字符数
                const codes: number[] = [];
                for (let index = 0; index < totalChars.length; index++) {
                    const element = totalChars[index];
                    if (!bundleChars.has(element)) {
                        codes.push(element);
                    }
                }

                ctx.info("参与自动分包：", codes.length);
                const unicodeRank: number[][] = opt.unicodeRank ?? [
                    Latin,
                    await getCN_SC_Rank(),
                ];

                // 把末尾的东西，额外分成一部分
                const finalChunk = codes.filter(
                    (i) => !unicodeRank.some((rank) => rank.includes(i))
                );

                unicodeRank.push(finalChunk);
                for (const rank of unicodeRank) {
                    const chunks = await autoSubset(
                        face,
                        hb,
                        rank,
                        async (filename, buffer) => {
                            return outputFile(
                                path.join(input.destFold, filename),
                                buffer
                            );
                        },
                        input.targetType ?? "woff2",
                        ctx,
                        opt.chunkSize
                    );
                    subsetResult.push(...chunks);
                }

                face.destroy();
                blob.free();
                ctx.free("blob", "face", "hb");
            },
            async function outputCSS(ctx) {
                const { nameTable, subsetResult, input } = ctx.pick(
                    "input",
                    "nameTable",
                    "subsetResult"
                );
                const css = createCSS(subsetResult, nameTable, {
                    css: input.css,
                    compress: false,
                });
                await outputFile(
                    path.join(
                        input.destFold,
                        input.cssFileName ?? "result.css"
                    ),
                    css
                );
            },
            async function outputHTML(ctx) {
                const { nameTable, subsetResult, input } = ctx.pick(
                    "input",
                    "nameTable",
                    "subsetResult"
                );
                if (input.testHTML !== false) {
                    const { createTestHTML } = await import(
                        "./templates/html/index.js"
                    );
                    const reporter = createTestHTML();
                    await outputFile(
                        path.join(input.destFold, "index.html"),
                        reporter
                    );
                }
            },
            async function outputReporter(ctx) {
                const { nameTable, subsetResult, input } = ctx.pick(
                    "input",
                    "nameTable",
                    "subsetResult"
                );
                if (!(input.testHTML === false && input.reporter === false)) {
                    const reporter = createReporter(
                        subsetResult,
                        nameTable,
                        input,
                        exec.records
                    );
                    await outputFile(
                        path.join(input.destFold, "reporter.json"),
                        reporter
                    );
                }
            },
        ],
        createContext(opt)
    );
    const ctx = await exec.run();
};
