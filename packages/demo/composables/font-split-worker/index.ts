import { fontSplit, Assets } from "@konghayao/cn-font-split/dist/browser/index";
import { expose } from "comlink";
// const root = "https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split@4.1.0";
// Assets.redefine({
//     "hb-subset.wasm": root + "/dist/browser/hb-subset.wasm",
//     "cn_char_rank.dat": root + "/dist/browser/cn_char_rank.dat",
//     "unicodes_contours.dat": root + "/dist/browser/unicodes_contours.dat",
// });
expose({
    fontSplit(args: any, outputFile: any) {
        return fontSplit({ ...args, outputFile });
    },
});
// fontSplit({
//     destFold: "./temp",
//     FontPath: "/SmileySans-Oblique.ttf",
//     targetType: "woff2",
//     // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
//     // previewImage: {},
//     async outputFile(path, buffer) {
//         console.log(path);
//     },
// });
