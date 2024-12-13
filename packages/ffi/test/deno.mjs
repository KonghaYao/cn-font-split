import fs from 'fs-extra';
import { fontSplit } from '../lib/deno.ts'
const inputBuffer = new Uint8Array(fs.readFileSync("../../../demo/public/SmileySans-Oblique.ttf").buffer);

await fontSplit({
    input: inputBuffer,
    out_dir: "./dist/font"
})
