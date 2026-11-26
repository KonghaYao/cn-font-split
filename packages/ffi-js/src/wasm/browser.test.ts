// 浏览器 / WASI 冒烟脚本（**不是** node:test 单测）。
//
// 运行环境要求：
//   1. 浏览器或 Bun 这类可解析无扩展名 import 的宿主（这里 import 的是构建产物
//      `dist/wasm/index`，不是源码）；
//   2. 先构建 wasm 入口：`pnpm -C packages/ffi-js build`；
//   3. 联网：下面会从 jsdelivr / imagekit 拉一个 4MB 级字体与一个发布用的
//      libffi-wasm32-wasip1.wasm。
//
// 因此它没有 test() 用例，也不在默认 `test` 脚本的 glob（`src/*.test.ts`，
// 不匹配子目录）里。需要手动跑时用：
//   pnpm -C packages/ffi-js build && pnpm -C packages/ffi-js smoke:wasm-browser
import { fontSplit, StaticWasm } from '../../dist/wasm/index';
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());

const wasm = new StaticWasm(
    'https://ik.imagekit.io/github/KonghaYao/cn-font-split/releases/download/7.0.0-beta-4/libffi-wasm32-wasip1.wasm',
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
