import analyze from "rollup-plugin-analyzer";
import json from "@rollup/plugin-json";
import common from "@rollup/plugin-commonjs";
import babel from "@rollup/plugin-babel";
import fse from "fs-extra";
import resolve from "@rollup/plugin-node-resolve";

// 防止打包时删除 ts 的类型注解
// emptyDirSync("./dist/");

export default {
    input: "./src/index.ts",
    output: {
        dir: "./dist/browser",
        format: "es",
        paths: {
            imagescript: "https://esm.sh/imagescript",
            "@chinese-fonts/wawoff2": "https://esm.sh/@chinese-fonts/wawoff2",
        },
    },

    plugins: [
        json({
            namedExports: false,
        }),
        {
            async resolveId(source, importer, options) {
                const external = [
                    "imagescript",
                    "@chinese-fonts/wawoff2",
                    "@konghayao/harfbuzzjs",

                    "fs-extra",
                    "fs/promises",
                ];
                if (external.includes(source)) {
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
