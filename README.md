# 中文 Web Font 切割工具


![中文网字计划](/assets/chinese-fonts.png)

![updateTime](https://img.shields.io/badge/更新时间-2024/06/13-green)
![author](https://img.shields.io/badge/author-江夏尧-green)
![npmVersion](https://img.shields.io/badge/LTS_version-4.15.1-green)
[![](https://data.jsdelivr.com/v1/package/npm/cn-font-split/badge)](https://www.jsdelivr.com/package/npm/cn-font-split)

![NPM License](https://img.shields.io/npm/l/%40konghayao%2Fcn-font-split)
![CodeFactor](https://www.codefactor.io/repository/github/konghayao/cn-font-split/badge)

| [中文网字计划](https://chinese-font.netlify.app/) | [Github](https://github.com/KonghaYao/cn-font-split) | [在线使用](https://chinese-font.netlify.app/online-split/)|
| ------------------------------------------------- | ---------------------------------------------------- |---------------------------------------------------- |
## 简介

`cn-font-split` 是 **[中文网字计划](https://chinese-font.netlify.app/)** 所使用的字体分包工具，通过高性能的各种技术将庞大的字体包拆分为适合网络分发的版本。经过四个版本的字体研究与代码迭代，这项技术在我们的网站中得到了充分的应用，实现了中文字体在 Web 领域的加载速度与效率的双飞跃。

`cn-font-split` 不仅支持中文，针对于 CJK 皆有优化，可以根据实际字体包内字符进行分包。

-   🚀 `自研多线程`+ (`WebAssembly`｜`Native`) 分包速度极快；
-   💻 坚持 Web 平台为基底，兼容性极强，浏览器、Node、Deno、CICD 环境，统统可以运行。
-   🔧 功能齐全完备，支持生成文字图片预览，支持完整全字符，支持复杂字形！
-   ⛰️ 自研 Harfbuzz 文本 SVG 引擎，独立渲染文本图像。
-   🚄 **我们有编译器插件啦! —— [vite-plugin-font](https://npmjs.com/package/vite-plugin-font), 支持 Vite、Nuxt、Next、Webpack、Rspack，快速嵌入你的前端工具链。**

> [Opentype Feature 支持情况](/packages/test/SUPPORT_FEATURE.md) 支持 95 ｜ 部分支持 9｜ 等待测试 20

[详见兼容性章节](#兼容性提醒)。

| [Nodejs](#nodejs) | [Deno](#deno) | [Chrome](#browser) | [FireFox](#browser) | [Safari](#browser) | [Bun](#bun) |
| -------------------- | ------------- | ------------------ | ------------------- | ------------------ | -------- |
| ✅^18.0.0 ⏺️ ^14.0.0 | ✅^1.30.0 | ✅^102 | ✅^114 | ✅^15 | ⏺️ ^1.0.4 |

### 新版本功能

1. ✅ 🔒 完备测试与版本发布流程！
2. ✅ 🚀 多线程压缩，核心越多，速度越快！（1310ms -> 760ms）
3. ✅ 🚀 使用 WASM 和原生工具解析与分包，提升打包速度。
4. ✅ 🔒 依赖检查与重构，安全版本。
5. ✅ 📦 更加可控的分包方式，支持细颗粒度的字符拆分。
6. ✅ 🔔 支持 OTF 格式字体打包，支持复杂字形渲染。
7. ✅ 🏞️ 字体预览图生成
8. ✅ ⌨️ 支持 Nodejs、Deno、Bun、Browser，随处可使用！
9. ✅ 🥳 不止中文，只要是包内的字符，统统分包

## 快速使用

Nodejs 版本推荐使用 **大于 18 的版本**。如低级版本或者其他的设备环境，[参考兼容性章节](#兼容性提醒)。

### 安装

```bash
npm install cn-font-split
npm install cn-font-split -g # 如果使用命令行，推荐全局安装
```

### 命令行使用

```bash
# -i 输入 -o 输出
cn-font-split -i=../demo/public/SmileySans-Oblique.ttf -o=./temp

# 参数与正常 js 操作是一样的，深层json则需要使用 . 来赋值
cn-font-split -i=../demo/public/SmileySans-Oblique.ttf -o=./temp --renameOutputFont='[hash:10][ext]' --css.fontWeight=700

# 显示输入参数说明，虽然会显示 typescript 类型。。。
cn-font-split -h
```

### 项目内打包代码

```js
import { fontSplit } from 'cn-font-split';

fontSplit({
    FontPath: './fonts/SourceHanSerifCN-Bold.ttf', // 推荐使用 otf、ttf 字体
    destFold: './build',
    chunkSize: 60 * 1024, // 如果需要的话，自己定制吧
    testHTML: true, // 输出一份 html 报告文件
    reporter: true, // 输出 json 格式报告
    previewImage: {}, // 只要填入 这个参数，就会进行图片预览文件生成，文件为 SVG 格式
    css: {
        // 覆盖默认的 css 设置，一般不需要进行更改
        // fontFamily: "站酷庆科黄油体",
        // fontWeight: 400,
    },
    // 自定义分包输出的文件名为 10 位短哈希，或者使用自增索引: '[index][ext]'
    renameOutputFont: '[hash:10][ext]',
    // 或者也可以像这样传入一个函数返回自定义的文件名
    // renameOutputFont: ({ transferred, ext, index }) => {
    //   return index.toString(36) + ext
    // } 
});
```

### 打包成品目录解释

```txt
- build
    ... // 很多字体分包，hash 命名
    - index.html // 用于展示打包分析报告, 需要开一个服务端口进行查看
    - reporter.json // 打包信息
    - result.css // css 入口，引入这个 css 文件即可使用字体包
```

### 更多 demo

1. [Nodejs 使用](/packages/subsets/test/node.test.mjs)
2. [Deno 使用](/packages/subsets/test/deno.test.js)
3. [Bun 使用](/packages/subsets/test/bun.test.js)
4. [浏览器使用](https://github.com/KonghaYao/chinese-free-web-font-storage/blob/feature/docs/src/components/online-split/index.tsx)

## 提高网站的字体加载速度

1. **切割分包大小适当**：我的建议是设置 50-70KB 左右范围进行打包，这样单个包的大小不会太大，HTTP/2 的加载速度也够快。cn-font-split 的默认值是 70 KB 能够满足大多数场景。
2. **使用支持并发加载的 CDN**： JSDelivr、ESM.sh 等公益 CDN 都进行了并发数限制，一旦你的网站一次性加载字体包太多就会触发 CDN 熔断。后面我使用了 Netlify 进行私有化部署，速度是瞬间加载！使用 ImageKit CDN 进行字体加载，也是瞬间完成！
3. **一定要配置 HTTP 缓存条件**：在有缓存时，用户打开你的网站是可以达到 50ms 内瞬间加载完所有字体包的。由于字体文件配置一次就基本上不会进行改动，所以可以持久缓存。
4. **文档站点的预加载**：如果网站有条件，可以在首页或者是所有页面，在浏览器空闲的时候，使用 js 的 fetch （force-cache） 请求所有的字体包。这样浏览器会把字体都加入进缓存中，从而保证其它页面的文字也能迅速加载。至于分包的具体名称，可以使用 reporter.json 文件查看。
5. **首屏优化**：推荐使用 [vite-plugin-font](https://npmjs.com/package/vite-plugin-font)。它可以扫描代码中使用的字符，并与你的前端工具链进行结合，实现最小化字体切割。

## 开发相关

1. 本仓库为 Monorepo，需要使用 pnpm 链接 workspace
2. 项目源文件在 packages/subsets，通过 workspace 进行模块化链接。
3. 所有使用的指令必须使用 pnpm 相关的方法，防止 workspace 的兼容问题
4. 构建 subsets 子项目时，先进行 `pnpm -C ./packages/font-sharp build`
5. 仓库中引用的部分 npm 包在我的其它仓库中，因为适应性问题进行了一部分源代码的修改。

## 一些特殊情况

1. 不支持 woff 和 eot 文件：
    1. eot 在 Web 端支持度极低，故不支持
    2. woff 类型的压缩率和普及率远不及 woff2，提供的字体源也很少使用 woff（一般有 otf 或者 ttf），故不支持。
2. 部分字体开发的时候用了比较奇怪的字体编辑器，可能最终导出的字体会报错。
    1. 这种情况最好找字体设计师再导出一份可用版本
    2. 或者自己用 FontForge 进行修复，这个就比较麻烦了

## 兼容性提醒

### 🚀 Nodejs

> version: ✅^18.0.0 ⏺️ ^14.0.0 可以使用一些 polyfill [Nodejs 使用](/packages/subsets/test/node.test.mjs)

1. Nodejs 几乎不需要进行适配，可以直接使用。
2. Nodejs 18 以下的代码需要支持 esm、fetch、worker_threads 等高级特性，如果不支持部分特性，可以找找社区的 polyfill 插件。[polyfill 示例](https://github.com/KonghaYao/cn-font-split-test/tree/main/test)

### Browser

> version: ✅ Chrome 102; FireFox 114; Safari 15 [浏览器使用](https://github.com/KonghaYao/chinese-free-web-font-storage/blob/feature/docs/src/components/online-split/index.tsx)

1. 浏览器需要 支持 module worker（多线程必须）、支持 WebAssembly 相关功能
2. 在网页中引入时，不要对 cn-font-split 再次打包（会导致奇奇怪怪的依赖问题）
3. 可以使用 CDN 导入 /dist/browser/index.js 文件，这个是支持的。
4. 浏览器版本可以直接在浏览器运行分包任务，比其他生态环境要方便得多，项目组会一直支持。

### 🚀 Deno

> version: ✅^1.30.0 [Deno 使用](/packages/subsets/test/deno.test.js)

1. 1.30.0 为不自动本地安装的版本，后续版本中使用了本地 npm 路径导入，导致部分情况下性能衰弱。可以参考 `deno run -A --no-npm index.mjs` 避免。

### Bun

> version: ⏺️^1.0.4 [Bun 使用](/packages/subsets/test/bun.test.js)

1. Bun 现在的版本只能跑在 Linux 和 Mac 平台，Windows 似乎官方在支持
2. Bun 在我的 Mac 上运行良好，但是到某些 Linux 平台上，就会出问题。
3. Bun 运行速度比 Nodejs 要快 30% 左右（保守估计）。

### 感谢

1. 项目核心插件为 Harfbuzz 项目，源项目使用 C 与 C++ 构建了一个字体布局工具，然后提供了 WASM 的打包方法。项目重新构建并提供了 Typescript 版本的 API 封装，使得代码可以更好地融入生态中。
2. opentype.js 这个项目为第二解析引擎，主要处理 feature 关系判断和文本转化为 SVG 的任务，在渲染方面给我们的支持很多。
3. wawoff2 项目将 Google 的 woff2 格式转换功能代码编译成为了 wasm，为我们的字体压缩提供了非常简便的 API。但是 wawoff2 项目的导出方式为 js 嵌入 wasm，极大影响了 js 打包和使用，故项目也重新构建并发布出适合的版本。
4. @napi-rs/ttf2woff2 使得 Nodejs 平台和 Bun 平台可以以极快的原生速度压缩字体文件，效率极高，速度极快。
5. 多线程采用了 workerpool 的解决方案，多线程的加持下，速度快了非常多。

## 开源许可证

Apache-2.0
