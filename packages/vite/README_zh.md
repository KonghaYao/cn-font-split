# 🔠 vite-plugin-font ⚡

[中文](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README_zh.md) | [English](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README.md)

[中文网字计划](https://chinese-font.netlify.app) 开发支持的 vite 字体构建工具。 vite-plugin-font 可以将庞大的字体切割成 Webfonts，性能强大且简单。vite-plugin-font 由 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 支持

我们提供了对于首屏优化的[极小量级优化](#极小量级优化)方案和针对于大文本站点优化的全量级优化，实现了中文字体在前端工具链中的极致优化。

## ⚡ Feature

1. ⚙️ 自动 CJK (中日韩) 字体分割，按需加载速度极快
2. 🚀 根据项目中使用的字符，自动优化首屏最佳
3. 🔄 字体自动转换为 woff2 格式，无需担心大小问题
4. 🌐 自动添加本地适配，减少内容位移累积，SSR 支持
5. 📤 字体信息导出，支持树摇优化
6. 🎨 纯 CSS，无运行时数据，多平台适配

| Type                          | [Vite、Astro、Qwik](#vite) | [Nuxt](#nuxt) | [Next](#next) | [Webpack、Rspack](#webpack) |
|-------------------------------|--------------------------|---------------|---------------|----------------------------|
| 全量级优化                    | ✅                        | ✅             | ✅             | ✅                          |
| [极小量级优化](#极小量级优化) | ✅                        | ✅             | ✅             | ✅                          |

> 1. 全量级优化适合于博客、文档网站，需要大量不确定文本，可以实现全量级的字体渲染，并且配合 CDN 可以有非常好的缓存性能。
> 2. [极小量级优化](#极小量级优化)适合于官网、大促网页等快速渲染需求大的场景，它收集你的代码中使用的字符，并只加载这些字符，拥有非常好的渲染性能。

## 📦 Install

```sh
npm i -D vite-plugin-font
```

## ✨ Config

### Vite

> 几乎所有使用了 Vite 作为底层编译框架的框架，都可以通过定义 `plugins` 的方式来使用 `vite-plugin-font`

```js
// vite.config.js
import { defineConfig } from 'vite';
import viteFont from 'vite-plugin-font';
export default defineConfig({
    plugins: [viteFont()],
});
```

### Nuxt

```js
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ['node_modules/vite-plugin-font/src/nuxt'],
    fontSplit: {
        scanFiles: ["pages/**/*.{vue,ts,tsx,js,jsx}"]
    }
});
```

### Next

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, options) => {
        config.module.rules.push({
            test: /\.(otf|ttf)/,
            use: [
                {
                    loader: './node_modules/vite-plugin-font/dist/webpack.mjs',
                    options: {},
                },
            ],
        });
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
    module: {
        rules: [
            {
                test: /\.(otf|ttf)/i,
                use: [
                    {
                        loader: './node_modules/vite-plugin-font/dist/webpack.mjs',
                        options: {},
                    },
                ],
            },
        ],
    },
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
import viteFont from 'vite-plugin-font';
export default defineConfig({
    plugins: [
        viteFont({
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
