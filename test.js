const fontSplit = require("./dist/index.js");
const fse = require("fs-extra");

// 需要先进行 npm run build 生成字体文件

fse.emptyDirSync("./build");
fontSplit.default({
    FontPath: "./fonts/站酷庆科黄油体.ttf",
    destFold: "./build",
    css: {
        fontStyle: "normal",
        fontWeight: "normal",
        fontDisplay: "swap",
        fontFamily: "", // 如果不设置的话将会使用默认的字体名称哦
    },
    charset: {
        other: true,
        TC: true,
        SC: true,
    },
});
