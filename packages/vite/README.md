# 🔠  vite-plugin-font ⚡

[中文](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README_zh.md) | [English](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README.md)

[vite-plugin-font](https://www.npmjs.com/package/vite-plugin-font) is a font building tool for Webfonts that supports the [Chinese Font Splitting Project](https://chinese-font.netlify.app) and is optimized for performance and simplicity. It can split large fonts into Webfonts. 

We provide both a [minimal optimization](#minimal-optimization) plan for first-screen optimization and a full optimization plan for large text sites, achieving the ultimate optimization of Chinese fonts in the front-end toolchain.

## ⚡ Feature

1. ⚙️ Automatic CJK (Chinese, Japanese, and Korean) font splitting, with extremely fast on-demand loading speed
2. 🚀 Automatically optimize the first screen based on the characters used in the project
3. 🔄 Automatically convert fonts to the woff2 format, so you don't have to worry about size issues
4. 🌐 Automatically add local adaptation to reduce content displacement accumulation, with SSR support
5. 📤 Export font information to support tree shaking optimization
6. 🎨 Pure CSS, no runtime data, multi-platform adaptation

| Type                                          | [Vite, Astro, Qwik](#vite) | [Nuxt](#nuxt) | [Next](#next) | [Webpack, Rspack](#webpack) |
|-----------------------------------------------|----------------------------|---------------|---------------|-----------------------------|
| Full optimization                             | ✅                          | ✅             | ✅             | ✅                           |
| [Minimal optimization](#minimal-optimization) | ✅                          | ✅             | ✅             | ✅                           |

> 1. Full optimization is suitable for blogs and documentation websites that require a large amount of uncertain text. It can achieve full font rendering and has excellent caching performance when used with CDNs.
> 2. [Minimal optimization](#minimal-optimization) is suitable for scenarios with high rendering requirements, such as official websites and large promotion pages. It collects the characters used in your code and only loads these characters, providing excellent rendering performance.

## 📦 Install

```sh
npm i -D vite-plugin-font
```

## ✨ Config

### Vite

> Almost all frameworks that use Vite as the underlying compilation framework can use `vite-plugin-font` by defining `plugins`.

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
// Automatically inject CSS to import fonts and support tree shaking optimization of font information!
import { css } from '../../demo/public/SmileySans-Oblique.ttf'; // Directly import font files
console.log(css.family, css.weight); // You can get CSS-related data from here

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

## Minimal Optimization

[Minimal optimization](#minimal-optimization) is suitable for scenarios with high rendering requirements, such as official websites and large promotion pages. It collects the characters used in your code and only loads these characters, providing excellent rendering performance.

> Add `scanFiles` . The approach of [Nuxt](#nuxt) and Webpack is slightly different, but both involve adding scan files to the options.

```js
// vite.config.js
import { defineConfig } from 'vite';
import viteFont from 'vite-plugin-font';
export default defineConfig({
    plugins: [
        viteFont({
            scanFiles: ['src/**/*.{vue,ts,tsx,js,jsx}'], // add this
        }), 
    ],
});
```

> Add `?subsets` to your links.

```diff
// Automatically inject CSS to import fonts and support tree shaking optimization of font information!
- import { css } from '../../demo/public/SmileySans-Oblique.ttf';
+ import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets';
console.log(css.family, css.weight); // You can get CSS-related data from here

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

#### Optimization for individual partitions

Sometimes, we need to package fonts based on different page dimensions, so we can use keys to identify the scope of using scanFiles.

```js
// This will match subset-1
import { css } from '../../demo/public/SmileySans-Oblique.ttf?subsets&key=subset-1';
```

```js
import { defineConfig } from 'vite';
import viteFont from 'vite-plugin-font';
export default defineConfig({
    plugins: [
        viteFont({
            scanFiles: {
                // ?subsets will match default
                'default': ['src/**/*.{json,js,jsx,ts,tsx,vue}'],
                'subset-1': ['example/**/*.{json,js,jsx,ts,tsx,vue}']
            },
        }), 
    ],
});
```

## Typescript support

The source code includes the `src/font.d.ts` file, which you can add to your `tsconfig.json`.

```json
{
    "compilerOptions": {
        "types": ["vite-plugin-font/src/font"]
    }
}
```

## Input parameters

See the [Chinese Font Splitting Project](https://www.npmjs.com/package/cn-font-split) documentation for input parameters. Most parameters are universal.