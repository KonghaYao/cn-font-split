import fs from 'fs';
import { fontSplit, endFontSplit } from '../dist/node/index.js'
const inputBuffer = new Uint8Array(fs.readFileSync("../demo/public/SmileySans-Oblique.ttf").buffer);
await fontSplit({
    input: inputBuffer,
    out_dir: "./dist/font"
})
endFontSplit()