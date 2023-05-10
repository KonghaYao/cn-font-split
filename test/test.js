import { fontSplit } from "../dist/index.js";
import { emptyDirSync } from "fs-extra";

// 需要先进行 npm run build 生成字体文件

emptyDirSync("./build");

fontSplit({
    FontPath: "./fonts/鸿雷行书简体.ttf",
    destFold: "./build",
    css: {
        // fontFamily: "站酷庆科黄油体", // 不建议使用，我们已经有内置的解析模块了
        // fontWeight: 400,
    },
    targetType: "woff2",
    chunkSize: 70 * 1024, // 如果需要的话，自己定制吧
    // previewImage: {}, // 只要填入 这个参数，就会进行图片预览文件生成
});
