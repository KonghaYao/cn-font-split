# 🔠 vite-plugin-font ⚡

[中文](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README_zh.md) | [English](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README.md)

[中文网字计划](https://chinese-font.netlify.app) 开发支持的 vite 字体构建工具。 vite-plugin-font 可以将庞大的字体切割成 Webfonts，性能强大且简单。vite-plugin-font 由 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 支持

## ⚡ Feature

1. ⚙️ 自动 CJK (中日韩) 字体分割，按需加载速度极快
2. 🔄 字体自动转换为 woff2 格式，无需担心大小问题
3. 🌐 自动添加本地适配，减少内容位移累积
4. 📤 字体信息导出，支持树摇优化
5. 🎨 纯 CSS，无运行时数据，多平台适配

| [Vite](#vite) | [Nuxt](#nuxt) | [Next](#nest-and-webpack) | [Webpack](#nest-and-webpack) |
| ------------- | ------------- | ------------------------- | ---------------------------- |
| ✅            | ✅            | ✅                        | ✅                           |

## 📦 Install

```sh
npm i -D vite-plugin-font
```

## ✨ Config

### Vite

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
});
```

### Nest And Webpack

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

```js
// webpack.config.js
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
