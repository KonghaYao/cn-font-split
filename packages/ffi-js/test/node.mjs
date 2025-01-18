import fs from 'fs';
import { fontSplit } from '../dist/node/index.mjs';
const inputBuffer = new Uint8Array(
    fs.readFileSync('../demo/public/SmileySans-Oblique.ttf').buffer,
);
// for (let index = 0; index < 10; index++) {

await fontSplit({
    input: inputBuffer,
    outDir: './dist/font',
    renameOutputFont: '[hash:6].[ext]',
    subsets: [[65]],
    languageAreas: false,
    autoSubset: false,
    fontFeature: false,
    reduceMins: false,
    silent: true,
});
console.log('end');
// }
