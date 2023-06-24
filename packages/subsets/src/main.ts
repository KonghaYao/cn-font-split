import { convert } from "./convert/font-converter";

import { hbjs } from "./hb";
import { Executor } from "./pipeline/index";
import { loadHarbuzzAdapter } from "./adapter/loadHarfbuzz";
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
import { env } from "./utils/env";
import { ConvertManager } from "./convert/convert.manager";
// import { SubsetService } from "./subsetService";

export const fontSplit = async (opt: InputTemplate) => {
    const outputFile = opt.outputFile ?? Assets.outputFile;
    const exec = new Executor(
        [
            /** 从路径或者二进制数据获取原始字体文件 */
            async function LoadFile(ctx) {
                ctx.info("cn-font-split 环境检测\t", env);
                typeof opt.log === "function" && ctx.recordLog(opt.log);
                const { input } = ctx.pick("input");
                let res!: Uint8Array;

                if (typeof input.FontPath === "string") {
                    res = await Assets.loadFileAsync(input.FontPath);
                } else if (input.FontPath instanceof Uint8Array) {
                    // 视为二进制数据
                    res = new Uint8Array(input.FontPath);
                }
                ctx.trace("输入文件大小：" + byteSize(res.byteLength));
                ctx.set("originFile", res);
            },
            /** 转换为 TTF 格式，这样可以被 HarfBuzz 操作 */
            async function transferFontType(ctx) {
                const { input, originFile } = ctx.pick("input", "originFile");

                const ttfFile = await convert(originFile, "truetype");
                ctx.set("ttfFile", ttfFile);
                ctx.free("originFile");
            },
            /** 创建包含字体展示的图片文件 */
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

            /** 加载 Harfbuzz 字体操作库 */
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
                if (opt.threads) {
                    opt.threads.service = new ConvertManager();
                }
                ctx.free("ttfFile");
            },
            /** 获取字体的基础信息，如字体族类，license等 */
            async function getBasicMessage(ctx) {
                const { face } = ctx.pick("face");
                const buffer = face.reference_table("name");
                const nameTable = decodeNameTableFromUint8Array(buffer!);
                console.table(nameTable);
                ctx.set("nameTable", nameTable);
            },

            /** 根据 subsets 参数进行优先分包 */
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
            /** 将剩下的字符进行自动分包 */
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
            /** 输出 css 文件 */
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
                const { input } = ctx.pick("input");
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
            async function Clear(ctx) {
                const { input } = ctx.pick("input");
                input.threads?.service?.destroy();
            },
        ],
        createContext(opt)
    );
    const ctx = await exec.run();
};
