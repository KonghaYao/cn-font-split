## cn-font-split 性能爆表 Wasm 版本

虽然在浏览器，但是速度极快。

```ts
import { fontSplit, StaticWasm } from './index';

// 你的字体
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());

// 只需要初始化一次
const wasm = new StaticWasm(
    'https://ik.imagekit.io/github/KonghaYao/cn-font-split/releases/download/7.0.0-beta-1/cn-font-split-7.0.0-beta-1-wasm32-wasi.Oz.wasm',
);

const data = await fontSplit(
    {
        input: new Uint8Array(input),
    },
    wasm.WasiHandle,
    {
        logger(str, type) {
            console.log(str);
        },
    },
);

console.log(data);
// { name: string, data: Uint8Array }[]
```
