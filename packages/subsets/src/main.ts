import { convert } from "./font-converter.js";
import { outputFile } from "fs-extra";
import { hbjs } from "./hb.js";
import { Executor } from "./pipeline/index.js";
import { loadHarbuzzAdapter } from "./adapter/loadHarfbuzz.js";
import { isBrowser, isNode } from "./utils/env.js";
import { subsetAll } from "./subset.js";
import { createContext, IContext } from "./fontSplit/context.js";
import path from "path";
import byteSize from "byte-size";
import { InputTemplate, Subsets } from "./interface.js";
import { decodeNameTableFromUint8Array } from "./reader/decodeNameTableFromUint8Array.js";

import { createReporter } from "./templates/reporter.js";
import { createCSS } from "./templates/css.js";
import { subsetsToSet } from "./utils/subsetsToSet.js";
import { foldLinearArray } from "./utils/foldLinearArray.js";

const autoChunk = (codes: number[]): Subsets => {
    const number = 700;
    const linearCodes = codes.sort((a, b) => a - b);
    const max = Math.ceil(codes.length / number);
    const res = [];
    for (let index = 0; index < max; index++) {
        res.push(
            foldLinearArray(
                linearCodes.slice(0 + index * number, number + index * number)
            )
        );
    }
    return res;
};

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
            async function combineSubsets(ctx) {
                const { input, face } = ctx.pick("input", "face");
                const subsets = input.subsets ?? [];

                const set = subsetsToSet(subsets);

                const arr = face.collectUnicodes();
                ctx.trace("总字符数", arr.length);
                const codes: number[] = [];
                for (let index = 0; index < arr.length; index++) {
                    const element = arr[index];
                    if (!set.has(element)) {
                        codes.push(element);
                    }
                }

                // autoChunk 算法, 暂定
                ctx.info("参与自动分包：", codes.length);
                const chunks = autoChunk(codes);
                subsets.push(...chunks);
                ctx.set("subsets", subsets);
            },
            async function subsetFonts(ctx) {
                const { input, hb, face, blob, subsets } = ctx.pick(
                    "input",
                    "face",
                    "hb",
                    "blob",
                    "subsets"
                );

                const subsetResult = await subsetAll(
                    face,
                    hb,
                    subsets,
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
