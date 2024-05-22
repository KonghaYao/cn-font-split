# 🔠 vite-plugin-cn-font-split ⚡

[中文](./README_zh.md) | [english](./README.md)

[vite-plugin-cn-font-split](https://www.npmjs.com/package/vite-plugin-cn-font-split) is a font building tool for [Chinese web fonts project](https://chinese-font.netlify.app) supported by Vite. It can split large fonts into Webfonts, with powerful performance and simplicity. vite-plugin-cn-font-split is supported by [cn-font-split](https://www.npmjs.com/package/cn-font-split).

## 📦 Install

```sh
npm i -D vite-plugin-cn-font-split
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import viteFont from 'vite-plugin-cn-font-split';
export default defineConfig({
        plugins: [viteFont()],
});
```


```jsx
// Automatically inject CSS to import fonts, and support tree shaking optimization of font information!
import { css } from '../../demo/public/SmileySans-Oblique.ttf';  // Directly import font files
console.log(css.family, css.weight); // You can get CSS-related data from here

export const App = ()=>{
        return <div style={{
            fontFamily: css.family 
    }}></div>
}

```

## Typescript Support

The source code includes the `src/font.d.ts` file, which you can add to your `tsconfig.json`.

```ts
{
      \"compilerOptions\": {
        \"types\": [\"vite-plugin-cn-font-split/src/font.d\"]
  }
}
```


## Input Parameters

Please refer to the usage instructions of [cn-font-split](https://www.npmjs.com/package/cn-font-split) for input parameters, most of which are common.