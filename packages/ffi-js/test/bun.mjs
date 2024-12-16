import fs from 'fs';
import { fontSplit } from '../dist/bun/index.js';
const inputBuffer = new Uint8Array(
    fs.readFileSync('../demo/public/SmileySans-Oblique.ttf').buffer,
);
console.time('bun');
await fontSplit({
    input: inputBuffer,
    out_dir: './dist/font',
});
console.timeEnd('bun');
