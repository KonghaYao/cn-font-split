import { convert } from "./font-converter";

import { hbjs } from "./hb";
import { Executor } from "./pipeline/index";
import { loadHarbuzzAdapter } from "./adapter/loadHarfbuzz";
import { isBrowser, isNode } from "./utils/env";
import { subsetAll } from "./subset";
import { createContext } from "./fontSplit/context";
import path from "path";
import byteSize from "byte-size";
import { InputTemplate } from "./interface";
import { decodeNameTableFromUint8Array } from "./reader/decodeNameTableFromUint8Array";
import { createReporter } from "./templates/reporter";
import { createCSS } from "./templates/css";
import { subsetsToSet } from "./utils/subsetsToSet";
import { autoSubset } from "./autoSubset/index";
import { Latin, getCN_SC_Rank } from "./ranks/index";
import { Assets } from "./adapter/assets";

export const fontSplit = async (opt: InputTemplate) => {
    const outputFile = opt.outputFile ?? Assets.outputFile;
    const exec = new Executor(
        [
            async function LoadFile(ctx) {
                const { input } = ctx.pick("input");
                let res!: ArrayBuffer;

                if (typeof input.FontPath === "string") {
                    res = await Assets.loadFileAsync(input.FontPath);
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

                let wasm = await loadHarbuzzAdapter();
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
                        "./templates/html/index"
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
