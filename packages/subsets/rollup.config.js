import analyze from "rollup-plugin-analyzer";
import json from "@rollup/plugin-json";
import babel from "@rollup/plugin-babel";
import fse from "fs-extra";
import resolve from "@rollup/plugin-node-resolve";

// 防止打包时删除 ts 的类型注解
// emptyDirSync("./dist/");

export default {
    external: [],
    input: "./src/index.ts",
    output: {
        dir: "./dist/",
        format: "es",
        paths: {},
    },
    plugins: [
        json({
            namedExports: false,
        }),
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

        resolve({
            extensions: [".ts", ".html"],
            moduleDirectories: [],
        }),
        babel({
            extensions: [".ts"],
            babelHelpers: "bundled",
        }),
        analyze({
            summaryOnly: true,
            writeTo: (str) => fse.outputFileSync("dist/index.analyze.txt", str),
        }),
    ],
};
