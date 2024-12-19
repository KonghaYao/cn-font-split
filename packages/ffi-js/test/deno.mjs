import fs from 'fs-extra';
import { fontSplit } from '../dist/deno/index.js'
const inputBuffer = new Uint8Array(fs.readFileSync("../demo/public/SmileySans-Oblique.ttf").buffer);

await fontSplit({
    input: inputBuffer,
    outDir: "./dist/font"
})
