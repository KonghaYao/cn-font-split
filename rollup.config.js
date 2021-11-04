import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import common from "@rollup/plugin-commonjs";
//新建一个rollup.config.js
export default [
    {
        input: "./src/index.js",
        output: {
            file: "./dist/fontSplit.esm.js",
            format: "es",
        },
        plugins: [
            json(),
            resolve({ node: true }),
            common({
                transformMixedEsModules: true,
            }),
        ],
    },
];
