import fs from "fs/promises";
import { fontSplit } from "../dist/index.js";

// const buffer = await fs.readFile(
//     "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
// );

fontSplit({
    destFold: "./temp",
    FontPath: "../../fonts/SourceHanSerifCN-Light.otf",
});
