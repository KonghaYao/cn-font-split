# 中文 Web Font 切割工具 7.0 —— Rust Speed

![中文网字计划](/assets/chinese-fonts.png)

![updateTime](https://img.shields.io/badge/更新时间-2024/07/16-green)
![author](https://img.shields.io/badge/author-江夏尧-green)
![npmVersion](https://img.shields.io/badge/LTS_version-5.1.0-green)
[![](https://data.jsdelivr.com/v1/package/npm/cn-font-split/badge)](https://www.jsdelivr.com/package/npm/cn-font-split)

![NPM License](https://img.shields.io/npm/l/%40konghayao%2Fcn-font-split)

| [中文网字计划](https://chinese-font.netlify.app/) | [Github](https://github.com/KonghaYao/cn-font-split) | [在线使用](https://chinese-font.netlify.app/online-split/) |
| ------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |

## 简介

`cn-font-split` 是 **[中文网字计划](https://chinese-font.netlify.app/)** 所使用的字体分包工具，通过高性能的各种技术将庞大的字体包拆分为适合网络分发的版本。经过七个大版本的字体研究与代码迭代，这项技术在我们的网站中得到了充分的应用，实现了中文字体在 Web 领域的加载速度与效率的双飞跃。

`cn-font-split` 不仅支持中文，针对于中韩日文字、少数民族文字、阿拉伯文等皆有优化，可以根据实际字体包内字符进行智能地分包。

- 🚀 `WebAssembly` 或者 `Rust FFI` 实现， 原生运行分包，进入秒级构建；
- 💻 坚持 Web 平台为基底，兼容性极强。浏览器、Node、Deno、CICD 环境，统统可以运行。Rust、JS、Python 多语言使用。
- 🔧 功能齐全完备，支持生成文字图片预览，支持完整全字符，支持复杂字形，支持可变字体！
- ⛰️ 自研 Rust 工具，构建文本 SVG 引擎，独立渲染文本图像。
- 🚄 **我们有前端编译器插件啦! —— [vite-plugin-font](https://npmjs.com/package/vite-plugin-font), 支持 Vite、Nuxt、Next、Webpack、Rspack，快速嵌入你的前端工具链。**

> [Opentype Feature 支持情况](/packages/test/SUPPORT_FEATURE.md) 支持 95 ｜ 部分支持 9｜ 等待测试 20

## 使用文档指引

- [JavaScript 文档](./packages/ffi-js/)

如果您想要支持某些语言，可以提交 Issues 或者 PR。

### 新版本功能

1. ✅ 🚀 原生构建支持，速度进入秒级时代（2MB 字体只需要 50ms）!
2. ✅ 🔒 完备测试与版本发布流程！
3. ✅ 📦 更加拟人的源代码，维护难度直线下降！
4. ✅ 🔒 依赖检查与重构，安全版本。
5. ✅ 📦 更加可控的分包方式，支持细颗粒度的字符拆分。
6. ✅ 🔔 支持 OTF 格式字体打包，支持复杂字形渲染。
7. ✅ 🏞️ 字体预览图生成
8. ✅ ⌨️ 支持 Nodejs、Deno、Bun、Browser，跨平台随处可使用、构建产物一致！
9. ✅ 🥳 不止中文，只要是包内的字符，统统分包
10. ✅ 🏞️ 支持自动识别可变字体字重

## 感谢

1. 项目核心插件为 [Harfbuzz](https://github.com/harfbuzz/harfbuzz)，为我们提供了专业级的字体子集化和字体绘制功能。我们采用了 Rust 版本的 [harfbuzz_rs_now](https://github.com/KonghaYao/harfbuzz_rs) 来嵌入 Rust 代码生态，实现了非常理想的字体子集化效果。
2. Rust [opentype](https://crates.io/crates/opentype) 项目提供了无与伦比的字体信息抽取能力，为字体特性和分包算法提供了强健的基础。
3. Rust [Cross](https://crates.io/crates/cross) 项目提供了强大的 Rust 跨平台产物构建能力。
4. 特别感谢 —— [通义千问](https://tongyi.aliyun.com/qianwen/) 和 GPT-4o 为 Rust 重构过程提供的诸多信息提示和代码帮助, 主项目能够在 20 天内完成 Rust 化，离不开大模型的辅助。

### 旧版本曾经使用过的项目

1. 6.0 版本中，opentype.js 是这个项目为第二解析引擎，主要处理 feature 关系判断和文本转化为 SVG 的任务，在渲染方面给我们的支持很多。
2. 6.0 版本中，@napi-rs/ttf2woff2 使得 Nodejs 平台和 Bun 平台可以以极快的原生速度压缩字体文件，效率极高，速度极快。
3. 6.0 版本中，wawoff2 项目将 Google 的 woff2 格式转换功能代码编译成为了 wasm，为我们的字体压缩提供了非常简便的 API。但是 wawoff2 项目的导出方式为 js 嵌入 wasm，极大影响了 js 打包和使用，故项目也重新构建并发布出适合的版本。
4. 6.0 版本中，多线程采用了 workerpool 的解决方案，多线程的加持下，速度快了非常多。

## 开源许可证

Apache-2.0
