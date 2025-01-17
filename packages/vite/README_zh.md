# 🔠 vite-plugin-font 5.0 ⚡

[中文](https://github.com/KonghaYao/cn-font-split/blob/release/packages/vite/README_zh.md) | [English](./README.md)

[中文网字计划](https://chinese-font.netlify.app) 开发支持的 vite 字体构建工具。 vite-plugin-font 可以将庞大的字体切割成 Webfonts，性能强大且简单。vite-plugin-font 由 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 支持，Rust 原生级构建速度。

我们提供了对于首屏优化的[极小量级优化](#极小量级优化)方案和针对于大文本站点优化的全量级优化，实现了中文字体在前端工具链中的极致优化。

## ⚡ Feature

1. ⚡ 速度极快提升 50%, 无惧卡段
2. ⚙️ 自动 CJK (中日韩) 字体分割，按需加载速度极快
3. 🚀 根据项目中使用的字符，自动优化首屏最佳
4. 🔄 字体自动转换为 woff2 格式，无需担心大小问题
5. 🌐 自动添加本地适配，减少内容位移累积，SSR 支持
6. 📤 字体信息导出，支持树摇优化
7. 🎨 纯 CSS，无运行时数据，多平台适配
8. 📦 自动减少中文 CLS 偏移

| Type                          | [Vite、Astro、Qwik](#vite) | [Nuxt](#nuxt) | [Next](#next) | [Webpack、Rspack](#webpack) |
| ----------------------------- | -------------------------- | ------------- | ------------- | --------------------------- |
| 全量级优化                    | ✅                         | ✅            | ✅            | ✅                          |
| [极小量级优化](#极小量级优化) | ✅                         | ✅            | ✅            | ✅                          |

> 1. 全量级优化适合于博客、文档网站，需要大量不确定文本，可以实现全量级的字体渲染，并且配合 CDN 可以有非常好的缓存性能。
> 2. [极小量级优化](#极小量级优化)适合于官网、大促网页等快速渲染需求大的场景，它收集你的代码中使用的字符，并只加载这些字符，拥有非常好的渲染性能。所需字体大小大约为全量级优化的 10%。

## 📦 Install

```sh
npm i -D vite-plugin-font
```

```js
import { css, fontFamilyFallback } from '../demo/public/SmileySans-Oblique.ttf';
document.body.style.fontFamily = `"${css.family}", ` + fontFamilyFallback;
```

## ✨ Config

### Vite

> 几乎所有使用了 Vite 作为底层编译框架的框架，都可以通过定义 `plugins` 的方式来使用 `vite-plugin-font`

```js
// vite.config.js
import { defineConfig } from 'vite';
import Font from 'vite-plugin-font';
export default defineConfig({
    plugins: [Font.vite()],
});
```

### Nuxt

```js
// https://nuxt.com/docs/api/configuration/nuxt-config
import font from 'vite-plugin-font';
export default defineNuxtConfig({
    devtools: { enabled: false },
    vite: {
        plugins: [font.vite({})],
    },
    compatibilityDate: '2024-10-26',
});
```

### Next

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, options) => {
        config.plugins.push(viteFont.webpack());
        return config;
    },
};

export default nextConfig;
```

### Webpack

```js
// webpack.config.js or rspack.config.js
const path = require('path');

module.exports = {
    plugins: [viteFont.webpack()],
};
```

## 🚀 Usage

```jsx
// 自动注入 css 导入字体，并且支持字体信息的摇树优化！
import { css } from '../../demo/public/SmileySans-Oblique.ttf'; // 直接 import 字体文件
console.log(css.family, css.weight); // 你可以从这里得到 css 相关的数据

export const App = () => {
    return (
        <div
            style={{
                fontFamily: css.family,
            }}
        ></div>
    );
};
```

## 极小量级优化

[极小量级优化](#极小量级优化)适合于官网、大促网页等快速渲染需求大的场景，它收集你的代码中使用的字符，并只加载这些字符，拥有非常好的渲染性能。

> 添加 `scanFiles`，[Nuxt](#nuxt) 和 Webpack 的方式略有不同，但都是往 options 里面添加扫描文件

```js
// vite.config.js
import { defineConfig } from 'vite';
import Font from 'vite-plugin-font';
export default defineConfig({
    plugins: [
        Font.vite({
            scanFiles: ['src/**/*.{vue,ts,tsx,js,jsx}'],
        }),
    ],
});
```

> 添加 `?subsets` 到你的链接中

```diff
// 自动注入 css 导入字体，并且支持字体信息的摇树优化！
- import { css } from '../../demo/public/SmileySans-Oblique.ttf';
+ import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets';
console.log(css.family, css.weight); // 你可以从这里得到 css 相关的数据

export const App = () => {
    return (
        <div
            style={{
                fontFamily: css.family,
            }}
        ></div>
    );
};
```

#### 单独分区优化

有些时候，我们需要根据不同的页面维度来进行字体分包，所以可以使用 key 来标识使用 scanFiles 的范围。

```js
// 这个将会匹配到 subset-1
import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets&key=subset-1';
```

```js
import { defineConfig } from 'vite';
import Font from 'vite-plugin-font';
export default defineConfig({
    plugins: [
        Font.vite({
            scanFiles: {
                // ?subsets 将会匹配 default
                default: ['src/**/*.{json,js,jsx,ts,tsx,vue}'],
                'subset-1': ['example/**/*.{json,js,jsx,ts,tsx,vue}'],
            },
        }),
    ],
});
```

## Typescript 支持

源码中包含 `src/font.d.ts` 文件，你可以将其加入 tsconfig.json 中。

```json
{
    "compilerOptions": {
        "types": ["vite-plugin-font/src/font"]
    }
}
```

## 输入参数

输入参数请见 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 使用说明，大部分参数都是通用的。
