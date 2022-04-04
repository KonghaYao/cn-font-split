const fontSplit = require("./dist/index.js");
const fse = require("fs-extra");

// 需要先进行 npm run build 生成字体文件

fse.emptyDirSync("./build");
fontSplit({
    FontPath: "./fonts/站酷庆科黄油体.ttf",
    destFold: "./build",
    css: {
        fontFamily: "站酷庆科黄油体",
        fontWeight: 400,
    },
});
