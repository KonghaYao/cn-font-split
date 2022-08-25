import { fontSplit } from "../dist/index.js";
import { emptyDirSync, move } from "fs-extra";

const types = ["ttf", "woff", "woff2", "eof"];
emptyDirSync("./build");
emptyDirSync("./benchmark");

for (let i = 0; i < types.length; i++) {
    await fontSplit({
        FontPath: "./fonts/SourceHanSerifCN-Bold.ttf",
        // FontPath: "./fonts/猫啃网故障黑.otf",
        destFold: "./build",
        css: {
            // fontFamily: "站酷庆科黄油体", // 不建议使用，我们已经有内置的解析模块了
            // fontWeight: 400,
        },
        targetType: types[i],
        // chunkSize: 200 * 1024, // 如果需要的话，自己定制吧
    });
    move("./build/reporter.json", `./benchmark/${types[i]}.json`);
}
