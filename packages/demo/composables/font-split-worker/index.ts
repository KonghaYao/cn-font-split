import { fontSplit } from "@konghayao/cn-font-split/dist/browser/index";
import { expose } from "comlink";
expose({
    async fontSplit(args: any, outputFile: any) {
        console.log(args);
        await fontSplit({ ...args, outputFile });
        return 1;
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
