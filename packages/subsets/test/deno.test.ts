import "https://deno.land/x/process@v0.3.0/mod.ts";

import { fontSplit, Assets, DenoAdapter } from "../dist/browser/index.js";

await DenoAdapter();
Assets.redefine({
    "hb-subset.wasm": "./dist/browser/hb-subset.wasm",
    "cn_char_rank.dat": "./dist/browser/cn_char_rank.dat",
    "unicodes_contours.dat": "./dist/browser/unicodes_contours.dat",
});

console.log(Assets);
fontSplit({
    destFold: "./temp",
    FontPath: "../../fonts/SmileySans-Oblique.ttf",
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
    threads: {},
});
