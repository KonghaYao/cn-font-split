import { fontSplit } from "../dist/index.js";
import { emptyDirSync } from "fs-extra";

// 需要先进行 npm run build 生成字体文件

emptyDirSync("./build");

fontSplit({
    FontPath: "./fonts/站酷庆科黄油体.ttf",
    destFold: "./build",
    css: {
        fontFamily: "站酷庆科黄油体",
        fontWeight: 400,
    },
    fontType: "ttf",
    targetType: "ttf",
    chunkSize: 200 * 1024,
});
