import fs from 'fs';
import { fontSplit } from '../dist/node/index.js'
const inputBuffer = new Uint8Array(fs.readFileSync("../demo/public/SmileySans-Oblique.ttf").buffer);
console.time("node")
await fontSplit({
    input: inputBuffer,
    outDir: "./dist/font"
    ,
})
console.timeEnd("node")