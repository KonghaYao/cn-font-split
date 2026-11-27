# font-analyze

a font analyze tool for Chinese Charset Check

```sh
npm i font-analyze
```

> **环境限制**：下面的用法适用于 Vite / webpack 等打包器；Node 原生 ESM 受上游
> `@konghayao/opentype.js` 的 `main` 字段影响暂不可用，详见
> `../../docs/RELEASE-8.0-NPM.md` §6。

```js
import { FontAnalyze } from 'font-analyze';
import fs from 'node:fs/promises';
const load = async (p) => JSON.parse(await fs.readFile('./node_modules/font-analyze/data/' + p, 'utf8'));
const file = await fs.readFile('./SmileySans-Oblique.ttf');
const report = await FontAnalyze(file.buffer, { charsetLoader: load });
```
