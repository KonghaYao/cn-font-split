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
import { InputTemplate } from "./interface.js";
import { decodeNameTableFromUint8Array } from "./reader/decodeNameTableFromUint8Array.js";

import { createCSS } from "./templates/css.js";

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
                const { input, hb, face, blob } = ctx.pick(
                    "input",
                    "face",
                    "hb",
                    "blob"
                );

                const subsetResult = await subsetAll(
                    face,
                    hb,
                    [[[30, 100]], [[0x4e00, 0x5000]], [[0x5000, 0x5500]]],
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
                outputFile(
                    path.join(
                        input.destFold,
                        input.cssFileName ?? "result.css"
                    ),
                    css
                );
            },
        ],
        createContext(opt)
    );
    const ctx = await exec.run();
};
