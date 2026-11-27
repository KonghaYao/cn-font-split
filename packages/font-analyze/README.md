# font-analyze

a font analyze tool for Chinese Charset Check

```sh
npm i font-analyze
```

> **兼容性说明**：Node 原生 ESM 与 Vite / webpack 等打包器都可直接 `import`
> （该修复在 8.0.0 之后发布的版本里生效，线上 8.0.0 仍是旧产物）。历史问题来自上游
> `@konghayao/opentype.js` 把 `package.json` 的 `main` 写成绝对路径
> `/dist/opentype.module.js`（Node 对没有 `exports` 的包回退到 `main` 解析，会报
> `ERR_MODULE_NOT_FOUND`）；现在包内直接引用该依赖 `module` 字段指向的真实文件
> `@konghayao/opentype.js/dist/opentype.module.js` 规避，依赖版本与字段均未改动。
> 背景见 [`docs/RELEASE-8.0-NPM.md` §6 第 8 条](https://github.com/KonghaYao/cn-font-split/blob/release/docs/RELEASE-8.0-NPM.md)。

```js
import { FontAnalyze } from 'font-analyze';
import fs from 'node:fs/promises';
const load = async (p) => JSON.parse(await fs.readFile('./node_modules/font-analyze/data/' + p, 'utf8'));
const file = await fs.readFile('./SmileySans-Oblique.ttf');
const report = await FontAnalyze(file.buffer, { charsetLoader: load });
```
