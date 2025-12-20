# 中文 Web Font 切割工具 7.0 —— Rust Speed

![中文网字计划](/assets/chinese-fonts.png)

![NPM License](https://img.shields.io/npm/v/cn-font-split)
![NPM License](https://img.shields.io/npm/l/cn-font-split)
![NPM License](https://img.shields.io/npm/dm/cn-font-split)
![author](https://img.shields.io/badge/author-江夏尧-green)
![updateTime](https://img.shields.io/badge/更新时间-2025/12/20-green)

| [中文网字计划](https://chinese-font.netlify.app/) | [Github](https://github.com/KonghaYao/cn-font-split) | [在线使用](https://chinese-font.netlify.app/zh-cn/online-split/) |
| ------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |

## 简介

`cn-font-split` 是 **[中文网字计划](https://chinese-font.netlify.app/)** 所使用的字体分包工具，通过高性能的各种技术将庞大的字体包拆分为适合网络分发的版本。经过七个大版本的字体研究与代码迭代，这项技术在我们的网站中得到了充分的应用，实现了中文字体在 Web 领域的加载速度与效率的双飞跃。

`cn-font-split` 不仅支持中文，针对于中韩日文字、少数民族文字、阿拉伯文等皆有优化，可以根据实际字体包内字符进行智能地分包。

-   🚀 `WebAssembly` 或者 `Rust FFI` 实现， 原生运行分包，进入秒级构建；
-   💻 坚持 Web 平台为基底，兼容性极强。浏览器、WASI、Linux、MacOS、Windows，统统可以运行。Rust、JS、Python 多语言复用。
-   📦 跨平台产物一致，无论哪个平台，运行 cn-font-split 得到的结果都是一致的。
-   🔧 功能齐全完备，支持生成文字图片预览，支持完整全字符，支持复杂字形，支持可变字体！
-   ⛰️ 自研 Rust 工具，构建文本 SVG 引擎，独立渲染文本图像。
-   🚄 **我们有前端编译器插件啦! —— [vite-plugin-font](https://npmjs.com/package/vite-plugin-font), 支持 Vite、Nuxt、Next、Webpack、Rspack，快速嵌入你的前端工具链。**

> 7.0 版本更改了一些使用方式，请阅读文档进行修改。
>
> [Opentype Feature 支持情况](/packages/test/SUPPORT_FEATURE.md) 支持 95 ｜ 部分支持 9｜ 等待测试 20

## 使用方式

```sh
# 国内请设置环境变量, windows 用 set
export CN_FONT_SPLIT_GH_HOST=https://ik.imagekit.io/github
# set CN_FONT_SPLIT_GH_HOST=https://ik.imagekit.io/github # windows
pnpm i cn-font-split
```

### 推荐：自动检测环境（Auto）

**推荐使用默认导入方式**，`cn-font-split` 会自动检测运行环境（Node.js、Bun、Deno）并选择最优的实现方式：

```js
import { fontSplit } from 'cn-font-split';
// 或者
import fontSplit from 'cn-font-split';

// Node.js 示例
import fs from 'fs';
const inputBuffer = new Uint8Array(
    fs.readFileSync('../demo/public/SmileySans-Oblique.ttf').buffer,
);

// Bun 示例
// const inputBuffer = await Bun.file('../demo/public/SmileySans-Oblique.ttf').arrayBuffer();

console.time('font-split');
await fontSplit({
    input: inputBuffer,
    outDir: './dist/font',
});
console.timeEnd('font-split');
```

### 直接使用特定实现（高级用法）

如果需要直接使用特定环境的实现，可以使用以下方式：

**Node.js 版本：**

```js
import { fontSplit } from 'cn-font-split/dist/node/index';
```

**Bun 版本：**

```js
import { fontSplit } from 'cn-font-split/dist/bun/index';
```

**Deno 版本：**

```js
import { fontSplit } from 'cn-font-split/dist/deno/index';
```

### 控制生成产物

```ts
import { fontSplit } from 'cn-font-split';
await fontSplit({
    input: inputBuffer,
    outDir: './dist/font',
    previewImage: {
        name: 'preview', // 文件名称
        text: '中文网字计划\nThe Chinese Web Font Project', // 需要渲染的字
    },
    testHtml: true,
    reporter: true,
});
```

### 完整的可传入参数

只有 `input` 和 `outDir` 是必须的参数，其他参数均为可选参数，没有特殊需求不建议修改。

```ts
import { fontSplit } from 'cn-font-split';
await fontSplit({
    input: inputBuffer, // 输入的字体缓冲区
    outDir: './dist/font', // 输出目录

    // subsets: [                // 手动分包范围，一般而言不需要手动配置
    //   [65,66,67],             // 第一个分包，对照: 65(A)、66(B)、67(C)
    //   [102,103,104],          // 第二个分包，对照: 102(f)、103(g)、104(h)
    // ],

    // css: {                        // CSS 输出产物配置，一般而言不需要手动配置
    //  fontFamily: 'Test Sans',     // 输出 css 产物的 font-family 名称
    //  fontWeight: '400',           // 字重: 400 (常规)、700(粗体), 详细可见 https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight
    //  fontStyle: 'normal',         // 字体样式: normal (常规)、italic (斜体)。可见 https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-style
    //  fontDisplay: 'swap',         // 字体显示策略，推荐 swap。可见 https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
    //  localFamily: ['Test Sans'],  // 本地字体族名称。可见 https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face
    //  commentUnicodes: false,      // 在 CSS 中添加 Unicode 码点注释
    //  compress: true               // 压缩生成的 CSS 产物
    // },

    // languageAreas: false,       // 是否启用语言区域优化，将同一语言的字符分到一起
    // autoSubset: true,           // 当分包超过指定大小时是否自动拆分
    // fontFeature: true,          // 是否保留字体特性（如 Code 字体的连字、字距调整等）
    // reduceMins: true,           // 是否减少碎片分包，合并小分包以减少请求数，一般不需要修改

    previewImage: {
        name: 'preview', // 预览图片的文件名
        text: '中文网字计划\nThe Chinese Web Font Project', // 预览图片的文本内容
    },

    // chunkSize: 70 * 1024,           // 单个分片目标大小
    // chunkSizeTolerance: 1 * 1024,   // 分片容差，一般不需要修改
    // maxAllowSubsetsCount: 10,       // 最大允许分包数量，可能会和 chunkSize 冲突

    testHtml: true, // 是否生成测试 HTML 文件
    reporter: true, // 是否生成 reporter.bin 文件

    // 自定义分包输出的文件名为 6 位短哈希，或者使用自增索引: '[index].[ext]'
    renameOutputFont: '[hash:6].[ext]',
    // 不在控制台打印多余的日志信息
    silent: true,
});
```

## WASM 版本

## cn-font-split 性能爆表 Wasm 版本

虽然在浏览器，但是速度极快。因为是 Wasm，所以 JS 环境基本都可以运行，我们甚至有一个 [deno 版本的服务器](./test/deno-wasm.mjs)。

```sh
# 首先安装 wasm 版本
cn-font-split i wasm32-wasip1
cn-font-split ls
```

```ts
import { fontSplit, StaticWasm } from 'cn-font-split/dist/wasm/index.js';
import wasmBuffer from 'cn-font-split/dist/libffi-wasm32-wasip1.wasm?url';
// 你的字体
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());

// 只需要初始化一次
const wasm = new StaticWasm(wasmBuffer);

const data = await fontSplit(
    {
        input: new Uint8Array(input),
        outDir: './dist',
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

## 感谢

1. 项目核心插件为 [Harfbuzz](https://github.com/harfbuzz/harfbuzz)，为我们提供了专业级的字体子集化和字体绘制功能。我们采用了 Rust 版本的 [harfbuzz_rs_now](https://github.com/KonghaYao/harfbuzz_rs) 来嵌入 Rust 代码生态，实现了非常理想的字体子集化效果。
2. Rust [opentype](https://crates.io/crates/opentype) 项目提供了无与伦比的字体信息抽取能力，为字体特性和分包算法提供了强健的基础。
3. Rust [Cross](https://crates.io/crates/cross) 项目提供了强大的 Rust 跨平台产物构建能力。
4. [Protobuf](https://github.com/protocolbuffers/protobuf) 作为整个项目的核心通信定义层，是跨语言代码生成、自动定义类型的好帮手。
5. 特别感谢 —— [通义千问](https://tongyi.aliyun.com/qianwen/) 和 GPT-4o 为 Rust 重构过程提供的诸多信息提示和代码帮助, 主项目能够在 20 天内完成 Rust 化，离不开大模型的辅助。

### 旧版本曾经使用过的项目

1. 6.0 版本中，opentype.js 是这个项目为第二解析引擎，主要处理 feature 关系判断和文本转化为 SVG 的任务，在渲染方面给我们的支持很多。
2. 6.0 版本中，@napi-rs/ttf2woff2 使得 Nodejs 平台和 Bun 平台可以以极快的原生速度压缩字体文件，效率极高，速度极快。
3. 6.0 版本中，wawoff2 项目将 Google 的 woff2 格式转换功能代码编译成为了 wasm，为我们的字体压缩提供了非常简便的 API。但是 wawoff2 项目的导出方式为 js 嵌入 wasm，极大影响了 js 打包和使用，故项目也重新构建并发布出适合的版本。
4. 6.0 版本中，多线程采用了 workerpool 的解决方案，多线程的加持下，速度快了非常多。

## v6 迁移指南

1. 部分函数入参改变，具体参照 Typescript 类型提示修正即可
    1. 比如 css 中的 comment 表示方法均被拍平了
    2. 部分分包的细节控制入参失效
2. 性能原因，不支持直接输入 woff2 文件进行分包
    1. 但是可以使用 wawoff2 等工具，将 woff2 转为 ttf Uint8Array，再进行分包
3. log 暂无输出方式，不影响主功能流程

## 开源许可证

Apache-2.0
