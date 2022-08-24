import analyze from "rollup-plugin-analyzer";
import json from "@rollup/plugin-json";
import babel from "@rollup/plugin-babel";
import { outputFileSync } from "fs-extra";
import { emptyDirSync } from "fs-extra";
import resolve from "@rollup/plugin-node-resolve";
emptyDirSync("./dist/");

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
            transform(code, id) {
                if (id.endsWith(".html")) {
                    return `export default \`${Buffer.from(code).toString(
                        "base64"
                    )}\``;
                }
            },
        },
        babel({
            extensions: [".ts"],
            babelHelpers: "bundled",
        }),
        resolve({
            extensions: [".ts"],
            moduleDirectories: [],
        }),
        analyze({
            summaryOnly: true,
            writeTo: (str) => outputFileSync("dist/index.analyze.txt", str),
        }),
    ],
};
