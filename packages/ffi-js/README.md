#

```sh
# 国内请设置环境变量,windows 用 set
export CN_FONT_SPLIT_GH_HOST="https://ik.imagekit.io/github"
pnpm i cn-font-split
```


## WASM 版本！

## cn-font-split 性能爆表 Wasm 版本

虽然在浏览器，但是速度极快。因为是 Wasm，所以 JS 环境基本都可以运行，我们甚至有一个 [deno 版本的服务器](./test/deno-wasm.mjs)。

```sh
# 首先安装 wasm 版本
cn-font-split install wasm32-wasip1
```

```ts
import { fontSplit, StaticWasm } from 'cn-font-split/dist/wasm';

// 你的字体
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());

// 只需要初始化一次
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
```

## 环境变量

| 参数名                 | 描述                   |
| ---------------------- | ---------------------- |
| CN_FONT_SPLIT_BIN      | 二进制动态链接库的地址 |
| CN_FONT_SPLIT_GH_HOST  | GitHub 域名（代理用）  |
| CN_FONT_SPLIT_PLATFORM | 覆盖默认判断的平台     |
