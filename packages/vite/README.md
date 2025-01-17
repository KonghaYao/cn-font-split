# 🔠 vite-plugin-font 5.0 ⚡

[中文](./README_zh.md) | [English](https://github.com/KonghaYao/cn-font-split/blob/release/packages/vite/README.md)

Developed and supported by the [Chinese WebFont Project](https://chinese-font.netlify.app), vite-plugin-font is a powerful and simple Vite font build tool that can split large fonts into Webfonts. It is powered by [cn-font-split](https://www.npmjs.com/package/cn-font-split) for Rust-native level build speed.

We provide an [Extremely lightweight optimization](#extremely-lightweight-optimization) solution for first-screen optimization and a full-scale optimization for large text sites, achieving extreme optimization of Chinese fonts in the front-end toolchain.

## ⚡ Features

1. ⚡ 50% faster speed, no fear of lag
2. ⚙️ Automatic CJK (Chinese, Japanese, Korean) font splitting, extremely fast on-demand loading
3. 🚀 Automatically optimizes the first screen based on characters used in your project
4. 🔄 Automatically converts fonts to woff2 format, no need to worry about size issues
5. 🌐 Automatically adds local adaptation, reduces cumulative content shifts, SSR support
6. 📤 Exports font information, supports tree shaking optimization
7. 🎨 Pure CSS, no runtime data, multi-platform compatibility
8. 📦 Automatically reduces Chinese CLS offset

| Type                          | [Vite, Astro, Qwik](#vite) | [Nuxt](#nuxt) | [Next](#next) | [Webpack, Rspack](#webpack) |
| ----------------------------- | -------------------------- | ------------- | ------------- | --------------------------- |
| Full-scale optimization       | ✅                         | ✅            | ✅            | ✅                          |
| [Extremely lightweight optimization](#extremely-lightweight-optimization) | ✅             | ✅            | ✅            | ✅                          |

> 1. Full-scale optimization is suitable for blogs, documentation websites, which require a large amount of uncertain text. It can achieve full-scale font rendering and has excellent cache performance when combined with CDN.
> 2. [Extremely lightweight optimization](#extremely-lightweight-optimization) is suitable for official websites, promotional web pages, etc., where quick rendering is required. It collects the characters used in your code and only loads these characters, providing excellent rendering performance. The required font size is approximately 10% of full-scale optimization.

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

> Almost all frameworks that use Vite as the underlying compilation framework can use `vite-plugin-font` by defining `plugins`.

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
// Automatically injects CSS to import fonts and supports tree shaking optimization of font information!
import { css } from '../../demo/public/SmileySans-Oblique.ttf'; // Directly import font file
console.log(css.family, css.weight); // You can get CSS-related data here

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

## Extremely Lightweight Optimization

[Extremely lightweight optimization](#extremely-lightweight-optimization) is suitable for official websites, promotional web pages, etc., where quick rendering is required. It collects the characters used in your code and only loads these characters, providing excellent rendering performance.

> Add `scanFiles`, the way to add it for [Nuxt](#nuxt) and Webpack is slightly different, but both are adding scan files to the options.

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

> Add `?subsets` to your link

```diff
// Automatically injects CSS to import fonts and supports tree shaking optimization of font information!
- import { css } from '../../demo/public/SmileySans-Oblique.ttf';
+ import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets';
console.log(css.family, css.weight); // You can get CSS-related data here

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

#### Separate Partition Optimization

Sometimes, we need to package fonts according to different page dimensions, so we can use a key to identify the range of scanFiles.

```js
// This will match subset-1
import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets&key=subset-1';
```

```js
import { defineConfig } from 'vite';
import Font from 'vite-plugin-font';
export default defineConfig({
    plugins: [
        Font.vite({
            scanFiles: {
                // ?subsets will match default
                default: ['src/**/*.{json,js,jsx,ts,tsx,vue}'],
                'subset-1': ['example/**/*.{json,js,jsx,ts,tsx,vue}'],
            },
        }),
    ],
});
```

## TypeScript Support

The source code includes the `src/font.d.ts` file, you can add it to tsconfig.json.

```json
{
    "compilerOptions": {
        "types": ["vite-plugin-font/src/font"]
    }
}
```

## Input Parameters

For input parameters, please refer to the usage instructions of [cn-font-split](https://www.npmjs.com/package/cn-font-split). Most parameters are universal.
