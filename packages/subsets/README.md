# 中文 Web Font 切割工具

| 更新时间： 2023 / 7 / 6 | 江夏尧 | `LTS` 4.3.6 | [![CodeFactor](https://www.codefactor.io/repository/github/konghayao/cn-font-split/badge)](https://www.codefactor.io/repository/github/konghayao/cn-font-split) | [中文网字计划](https://chinese-font.netlify.app/) | [Github](https://github.com/KonghaYao/cn-font-split) |
| ----------------------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------- |

## 简介

在工作中遇到了使用中文字体的烦恼，字体包动不动就 10 多 MB，没有办法在 Web 应用中使用，所以制作了这个字体切割的插件。通过插件将大的字体文件切割为多个小的字体文件，然后通过 CSS 文件的 `unicode-range` 按需加载，实现整个字符集的可用加载！多线程加 WebAssembly 分包速度极快，平台兼容性极强！[详见兼容性章节](#兼容性提醒)。

| [Nodejs](#nodejs)    | [Deno](#deno)      | [Chrome](#browser) | [FireFox](#browser) | [Safari](#browser) | Bun      |
| -------------------- | ------------------ | ------------------ | ------------------- | ------------------ | -------- |
| ✅^18.0.0 ⏺️ ^14.0.0 | ✅1.30.0 ⏺️^1.30.0 | ✅^102             | ✅^114              | ✅^15              | ❌Coming |

### 新版本功能

1. ✅ 🚀 多线程压缩，核心越多，速度越快！（13.4s -> 4.7s）
2. ✅ 🚀 使用 WASM 解析与分包，提升打包速度。
3. ✅ 🔒 依赖检查与重构，安全版本。
4. ✅ 📦 更加可控的分包方式，支持细颗粒度的字符拆分。
5. ✅ 🔔 支持 OTF 格式字体打包，支持复杂字形渲染。
6. ✅ 🏞️ 字体预览图生成
7. ✅ ⌨️ 支持 Nodejs、Deno、Browser，随处可使用！
8. ✅ 🥳 不止中文，只要是包内的字符，统统分包

### 成品预览

成品可以查看我的字体库网站：[点我进入中文字计划网站](https://chinese-font.netlify.app/)

> 里面的字体都是可以免费商用的，我对其进行了切割并且放置在了 [Github](https://github.com/KonghaYao/chinese-free-web-font-storage) 和 [Gitee](https://gitee.com/dongzhongzhidong/chinese-free-web-font-storage) 上，如果需要可以直接获取文件。

![中文网字计划](/assets/chinese-fonts.png)

## 快速使用

Nodejs 版本推荐使用 大于 18 的版本，如低级版本，需要 [参考兼容性章节](#兼容性提醒)。

### 安装

```bash
npm install @konghayao/cn-font-split
```

### 写打包代码

```js
import { fontSplit } from '@konghayao/cn-font-split';
// import { fontSplit } from "@konghayao/cn-font-split/dist/browser/index.js";
// import { fontSplit } from "https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split@4.3.6/dist/browser/index.js";

fontSplit({
    FontPath: './fonts/SourceHanSerifCN-Bold.ttf', // 部分 otf 文件会报错，最好使用 ttf 版本的字体
    destFold: './build',
    targetType: 'woff2', // ttf woff2；注意 eot 文件在浏览器中的支持度非常低，所以不进行支持
    chunkSize: 70 * 1024, // 如果需要的话，自己定制吧
    testHTML: true, // 输出一份 html 报告文件
    reporter: true, // 输出 json 格式报告
    // previewImage: {}, // 只要填入 这个参数，就会进行图片预览文件生成
    threads: {}, // 建议开启多线程
    css: {
        // 覆盖默认的 css 设置，一般完全不需要进行更改
        // fontFamily: "站酷庆科黄油体",
        // fontWeight: 400,
    },
});
```

### 打包成品目录

```
- build
    ... // 很多字体分包
    - index.html // 用于展示打包分析报告
    - reporter.json // 打包信息
    - result.css // css 入口，引入这个 css 文件即可使用字体包
```

### 更多 demo

1. [Nodejs 使用](/packages/subsets/test/test_threads.mjs)
2. [Deno 使用](/packages/subsets/test/deno.test.js)
3. [浏览器使用](/packages/demo/pages/index.vue)

## 提高你的字体加载速度

1. **切割分包大小适当**：我的建议是设置 50-100KB 左右范围进行打包，这样单个包的大小不会太大，HTTP/2 的加载速度也够快。cn-font-split 的默认值是 70 KB 能够满足大多数场景。
2. **使用支持并发加载的 CDN**： JSDelivr、ESM.sh 等公益 CDN 都进行了并发数限制，一旦你的网站一次性加载字体包太多就中断 CDN。后面我使用了 Netlify 进行私有化部署，速度是瞬间加载！使用 ImageKit CDN 进行字体加载，也是瞬间完成！
3. **一定要配置 HTTP 缓存条件**：在有缓存时，用户打开你的网站是可以达到 50ms 内瞬间加载完所有字体包的。由于字体文件配置一次就基本上不会进行改动，所以可以持久缓存。
4. **文档站点的预加载**：如果网站有条件，可以在首页或者是所有页面，在浏览器空闲的时候，使用 js 的 fetch （force-cache） 请求所有的字体包。这样浏览器会把字体都加入进缓存中，从而保证其它页面的文字也能迅速加载。至于分包的具体名称，可以使用 reporter.json 文件查看。
5. **字体文件下载抢占 JS 请求问题（出现概率低）**：字体文件如果在入口 HTML 文件中加载，那么浏览器会查看 HTML 中需要使用的字，并加载字体，但是在 JS 中使用数据请求就会出现问题。已经发出的字体下载占用了浏览器的下载并发数，进而推迟 JS 下载。我的建议是使用 JS 添加 link 标签动态导入 css 的方式延迟大概 150ms 即可。

## 开发相关

1. 本仓库为 Monorepo，需要使用 pnpm 链接 workspace
2. 项目源文件在 packages/subsets，通过 workspace 进行模块化链接。
3. 所有使用的指令必须使用 pnpm 相关的方法，防止 workspace 的兼容问题
4. 仓库中引用的部分 npm 包在我的其它仓库中，因为适应性问题进行了一部分源代码的修改。

## 一些特殊情况

1. 不支持 woff 和 eot 文件：
    1. eot 在 Web 端支持度极低，故不支持
    2. woff 类型的压缩率和普及率远不及 woff2，提供的字体源也很少使用 woff（一般有 otf 或者 ttf），故不支持。
2. 强制使用分包时，源字体没有某些字形，导致一个包内没有被分满。
    1. 例如：使用一个只有大致 6373 字符的字体，但是采用 Noto-Serif-SC 分包策略，那么部分包内会有缺失字体的现象，这是正常的。
    2. 这个特性，插件将不会进行干涉。
    3. 建议较全的字体包可以使用 Google 字体的中文分包方式，而小字体包使用自动分包策略就好了。

## 兼容性提醒

### Nodejs

> version: ✅^18.0.0 ⏺️ ^14.0.0 可以使用一些 polyfill [polyfill 示例](https://github.com/KonghaYao/cn-font-split-test/tree/main/test)

1. 需要支持 esm、fetch、worker_threads 等高级特性，如果不支持部分特性，可以找找社区的 polyfill 插件。
2. 低版本适配请看这里

### Deno

> version: ✅1.30.0 ⏺️ ^1.30.0

1. 1.30.0 为推荐版本，后续版本中使用了本地 npm 路径导入，导致性能衰弱。可以参考 `deno run -A --no-npm index.mjs` 避免。
2. 在 1.30.0 版本之后的一些特性导致了多线程失败。需要在配置中添加选项 `threads.image = false`使用单线程生成图片。
3. 性能上 Deno 比 Nodejs 要好一些，但是 Deno 正在开发中，故暂时观望一整子

### Browser

> version: ✅ Chrome 102; FireFox 114; Safari 15

1. 支持 module worker（多线程必须）
2. 支持 WebAssembly 相关功能
3. 不对项目成品文件再次打包（会导致奇奇怪怪的依赖问题）
4. 可以使用 CDN 导入 /dist/browser/index.js 文件，这个是支持的。

### 感谢

1. 项目核心插件为 Harfbuzz 项目，源项目使用 C 与 C++ 构建了一个字体布局工具，然后提供了 WASM 的打包方法。项目重新构建并提供了 Typescript 版本的 API 封装，使得代码可以更好地融入生态中。
2. 项目中的 name table 读取插件修改了 fonteditor-core 的源代码，神奇地完成了大量解析工作，真是太棒了。
3. wawoff2 项目将 Google 的 woff2 格式转换功能代码编译成为了 wasm，为我们的字体压缩提供了非常简便的 API。但是 wawoff2 项目的导出方式为 js 嵌入 wasm，极大影响了 js 打包和使用，故项目也重新构建并发布出适合的版本。
4. 多线程采用了 workerpool 的解决方案，但是 workerpool 不支持 module worker，我就在 rollup 的时候加上了这个功能。

## 开源许可证

2.0.5 及以后 Apache-2.0

2.0.4 版本以前 MIT License
