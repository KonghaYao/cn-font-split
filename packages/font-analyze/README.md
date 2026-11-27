# font-analyze

a font analyze tool for Chinese Charset Check

```sh
npm i font-analyze
```

```js
import { FontAnalyze } from 'font-analyze';
import fs from 'node:fs/promises';
const load = async (p) => JSON.parse(await fs.readFile('./node_modules/font-analyze/data/' + p, 'utf8'));
const file = await fs.readFile('./SmileySans-Oblique.ttf');
const report = await FontAnalyze(file.buffer, { charsetLoader: load });
```
