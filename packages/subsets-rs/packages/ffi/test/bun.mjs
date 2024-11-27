import fs from 'fs';
import { fontSplit } from '../dist/node/lib/bun.js'
const inputBuffer = new Uint8Array(fs.readFileSync("../../../demo/public/SmileySans-Oblique.ttf").buffer);

process.env.CN_FONT_SPLIT_BIN = "/app/cn-font-split/packages/subsets-rs/target/release/libffi.so"

await fontSplit({
    input: inputBuffer,
    out_dir: "./dist/font"
})
