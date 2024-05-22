# 🔠 vite-plugin-font ⚡

[中文](./README_zh.md) | [english](./README.md)

[中文网字计划](https://chinese-font.netlify.app) 开发支持的 vite 字体构建工具。 vite-plugin-font 可以将庞大的字体切割成 Webfonts，性能强大且简单。vite-plugin-font 由 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 支持

## 📦 Install

```sh
npm i -D vite-plugin-font
```

```js
// vite.config.js
import { defineConfig } from 'vite';
import viteFont from 'vite-plugin-font';
export default defineConfig({
    plugins: [viteFont()],
});
```

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

```ts
{
  "compilerOptions": {
    "types": ["vite-plugin-font/src/font.d"]
  }
}
```

## 输入参数

输入参数请见 [cn-font-split](https://www.npmjs.com/package/cn-font-split) 使用说明，大部分参数都是通用的。
