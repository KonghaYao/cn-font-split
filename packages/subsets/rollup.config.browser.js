import analyze from "rollup-plugin-analyzer";
import json from "@rollup/plugin-json";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import fse from "fs-extra";
import resolve from "@rollup/plugin-node-resolve";
import { createRequire } from "node:module";
import path from "node:path";
import alias from "@rollup/plugin-alias";
const nodeAssets = await fse.readJson("./src/adapter/nodeAssets.json");

const require = createRequire(import.meta.url);

// 防止打包时删除 ts 的类型注解
// emptyDirSync("./dist/browser/");

// 传递一次静态文件
await Promise.all(
    [
        ...Object.values(nodeAssets)
            .filter((val) => {
                return ![".", "/"].includes(val[0]);
            })
            .map((v) => {
                let src;
                if (v[0] === "&") {
                    src = path.resolve("./dist", v.slice(1));
                } else {
                    src = require.resolve(v);
                }
                // console.log(src);
                return src;
            }),

        ...[
            "@chinese-fonts/wawoff2/build/compress_binding.wasm",
            "@chinese-fonts/wawoff2/build/decompress_binding.wasm",
        ].map((i) => require.resolve(i)),
    ].map((i) => {
        return fse.copy(i, "./dist/browser/" + path.basename(i));
    })
);
import { createTypeForBrowser } from "./scripts/createTypeForBrowser.mjs";

createTypeForBrowser();
export default {
    input: "./src/index.ts",
    output: {
        dir: "./dist/browser",
        format: "es",
        paths: {
            imagescript: "https://esm.sh/imagescript",
        },
        globals: {
            process: "globalThis.process",
        },
    },

    plugins: [
        alias({
            entries: [{ find: "path", replacement: "path-browserify" }],
        }),
        json({
            namedExports: false,
        }),

        {
            async resolveId(source, importer, options) {
                const external = [
                    "imagescript",
                    // "@chinese-fonts/wawoff2",
                    "@konghayao/harfbuzzjs",
                    "module",
                    "fs-extra",
                    "fs/promises",
                ];
                if (external.includes(source) || source.startsWith("node:")) {
                    console.log(source);
                    return { id: source, external: true };
                }
            },
        },
        {
            name: "html",
            load: {
                order: "pre",

                handler(id) {
                    if (id.endsWith(".html")) {
                        const code = fse.readFileSync(id);
                        return {
                            code: `export default ${JSON.stringify(
                                code.toString("utf-8")
                            )}`,
                        };
                    }
                },
            },
        },
        common(),
        resolve({
            browser: true,
            extensions: [".ts", ".html"],
            // moduleDirectories: [],
            alias: {
                path: "path-browserify",
            },
            preferBuiltins: false,
        }),
        babel({
            extensions: [".ts"],
            babelHelpers: "bundled",
        }),
        analyze({
            summaryOnly: true,
            writeTo: (str) =>
                fse.outputFileSync("dist/browser/index.analyze.txt", str),
        }),
    ],
};
