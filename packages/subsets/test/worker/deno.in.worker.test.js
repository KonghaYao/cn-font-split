import { expose } from 'https://esm.sh/comlink';
import 'https://deno.land/x/process@v0.3.0/mod.ts';
import 'https://deno.land/x/xhr@0.3.0/mod.ts';
import { fileURLToPath } from 'https://deno.land/std@0.170.0/node/url.ts';
import { fontSplit, Assets, mockXHR } from '../../dist/browser/index.js';
// 让 XHR 在访问 fileURI 的时候转化为本地文件
const cache = new Map();
mockXHR({
    // 所有的 fetch 函数都会发送到这里
    proxy({ headers, body, method, url }) {
        // console.log(url);
        if (url.host === 'a')
            return (async () => {
                const path = fileURLToPath(
                    decodeURIComponent(url.hash.slice(1))
                );

                const item = cache.has(path)
                    ? cache.get(path)
                    : await Deno.readFile(path);
                cache.set(path, item);
                // console.log(path, item);
                // console.log(item);
                return new Response(item, {
                    status: 200,
                    headers: { 'content-type': 'application/wasm' },
                });
            })();
    },
    silent: true,
});

Assets.redefine({
    'hb-subset.wasm': './dist/browser/hb-subset.wasm',
    'cn_char_rank.dat': './dist/browser/cn_char_rank.dat',
    'unicodes_contours.dat': './dist/browser/unicodes_contours.dat',
});
///! very important 必须将 module worker 伪装成 classic worker
globalThis.importScripts = () => {};
expose({
    fontSplit,
});
