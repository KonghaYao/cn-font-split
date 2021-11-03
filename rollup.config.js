import json from "@rollup/plugin-json";
//新建一个rollup.config.js
export default [
    {
        input: "./src/index.js",

        output: {
            exports: "default",
            file: "./dist/fontSplit.common.cjs",
            format: "cjs",
        }, // 输出文件
        plugins: [json()],
    },
    {
        input: "./src/index.js",
        output: {
            file: "./dist/fontSplit.esm.js",
            format: "es",
        },
        plugins: [json()],
    },
];
