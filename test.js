import fontSplit from "./src/index.js";
import fse from "fs-extra";

// 需要先进行 npm run build 生成字体文件

fse.emptyDirSync("./build");
fontSplit({
    FontPath: "./fonts/SourceHanSerifCN-Bold.ttf",
    destFold: "./build",
    css: {
        fontStyle: "normal",
        fontWeight: "normal",
        fontDisplay: "swap",
        fontFamily: "testFontName", // 如果不设置的话将会使用默认的字体名称哦
    },
    charset: {
        other: true,
        TC: true,
        SC: true,
    },
});
