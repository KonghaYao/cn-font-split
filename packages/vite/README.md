# 🔠 vite-plugin-font ⚡

[中文](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README_zh.md) | [English](https://github.com/KonghaYao/cn-font-split/blob/ts/packages/vite/README.md)

[vite-plugin-font](https://www.npmjs.com/package/vite-plugin-font) is a font building tool for [Chinese web fonts project(中文网字计划)](https://chinese-font.netlify.app) supported by Vite. It can split large fonts into Webfonts, with powerful performance and simplicity. vite-plugin-font is supported by [cn-font-split](https://www.npmjs.com/package/cn-font-split).

## ⚡ Feature

1. ⚙️ Automatic CJK font segmentation, extremely fast loading on demand
2. 🔄 Automatic font conversion to woff2, no need to worry about size
3. 🌐 Automatic addition of local adaptation, reducing CLS
4. 📤 Font information export, supporting tree shaking optimization
5. 🎨 Pure CSS, no runtime data, multi-platform adaptation

| Vite | Nuxt |
| ---- | ---- |
| ✅   | ✅   |

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

## 🚀 Usage

```jsx
// Automatically inject CSS to import fonts, and support tree shaking optimization of font information!
import { css } from '../../demo/public/SmileySans-Oblique.ttf'; // Directly import font files
console.log(css.family, css.weight); // You can get CSS-related data from here

export const App = () => {
    return (
        <div
            style={{
                fontFamily: `"${css.family}"`,
            }}
        ></div>
    );
};
```

## Typescript Support

The source code includes the `src/font.d.ts` file, which you can add to your `tsconfig.json`.

```json
{
    "compilerOptions": {
        "types": ["vite-plugin-font/src/font"]
    }
}
```

## Input Parameters

Please refer to the usage instructions of [cn-font-split](https://www.npmjs.com/package/cn-font-split) for input parameters, most of which are common.
