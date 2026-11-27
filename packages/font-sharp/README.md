# Font To SVG Render

一个基于 Harfbuzz 的 SVG 字体渲染工具。

## 用途

把 TTF / OTF 字体和一段文本渲染成 SVG 字符串（一组 `<path>`），用于生成预览图、
做字形调试；不依赖浏览器或 canvas。

## 安装

```sh
npm i font-sharp
```

要求 Node.js >= 22（见 `package.json` 的 `engines`）。

## 用法

```js
import { font2svg } from 'font-sharp';
import fs from 'node:fs';

const ttf = new Uint8Array(fs.readFileSync('./SmileySans-Oblique.ttf'));

const svg = await font2svg(ttf, '中文网字计划\nThe Project For Web', {
    baseLine: 24, // 画布留白，默认 24
    lineHeight: 1, // 行高倍数，默认 1
    direction: 'ltr', // ltr | rtl | ttb | btt
});

fs.writeFileSync('./preview.svg', svg);
```

`font2svg(ttfFile: Uint8Array, text: string, options?)` 返回 SVG 字符串；`options`
即 `src/makeImage.ts` 的 `Font2SVGOptions`。包内同时导出底层的 `makeImage`。

## 已知限制

运行时依赖 `@konghayao/harfbuzzjs@^9.0.5`，它的 `hbjs.js` 只有 CJS 的
`module.exports`，而包自身声明了 `"type": "module"`：静态 ESM `import` 会报
`does not provide an export named 'default'`，`createRequire` 直接 `require` 也只能
拿到空命名空间。本包在 `src/font2svg.ts` 里读取源码后按 CJS 语义求值来规避；
上游补上 ESM 导出后即可还原为普通 `import`。背景见
[`Developer.md`](https://github.com/KonghaYao/cn-font-split/blob/release/Developer.md)。

## 许可证

Apache-2.0
