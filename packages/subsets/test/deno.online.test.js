import "https://deno.land/x/process@v0.3.0/mod.ts";

import {
    fontSplit,
    Assets,
    DenoAdapter,
} from "https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split@4.3.2/dist/browser/index.js";

await DenoAdapter();
const root = "https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split@4.3.2";
Assets.redefine({
    "hb-subset.wasm": root + "/dist/browser/hb-subset.wasm",
    "cn_char_rank.dat": root + "/dist/browser/cn_char_rank.dat",
    "unicodes_contours.dat": root + "/dist/browser/unicodes_contours.dat",
});

console.log(Assets);
fontSplit({
    destFold: "./temp",
    FontPath: "../demo/public/SmileySans-Oblique.ttf",
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
    threads: {},
});
