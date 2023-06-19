import "https://deno.land/x/process@v0.3.0/mod.ts";
import "https://deno.land/x/xhr@0.3.0/mod.ts";
import { fileURLToPath } from "https://deno.land/std@0.170.0/node/url.ts";
import { fontSplit, Assets, mockXHR } from "../dist/browser/index.js";
// 让 XHR 在访问 fileURI 的时候转化为本地文件
mockXHR({
    // 所有的 fetch 函数都会发送到这里
    proxy({ headers, body, method, url }) {
        // console.log(url);
        if (url.host === "a")
            return (async () => {
                const path = fileURLToPath(
                    decodeURIComponent(url.hash.slice(1))
                );
                const item = await Deno.readFile(path);
                // console.log(path, item);
                // console.log(item);
                return new Response(item, {
                    status: 200,
                    headers: { "content-type": "application/wasm" },
                });
            })();
    },
    silent: true,
});

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
});
