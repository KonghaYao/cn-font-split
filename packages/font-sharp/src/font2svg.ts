import { hbjs } from '../../subsets/src/hb.js';
import fs from 'fs';
import { Font2SVGOptions, makeImage } from './makeImage.js';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buf = fs.readFileSync(
    createRequire(path.resolve(__dirname)).resolve(
        '@konghayao/harfbuzzjs/hb.wasm',
    ),
);
const wasm = WebAssembly.instantiate(buf);

export const font2svg = async (
    ttfFile: Uint8Array,
    text: string,
    options?: Font2SVGOptions,
) => {
    if (!wasm) throw new Error('启动 harfbuzz 失败');
    const hb = hbjs((await wasm).instance);
    const blob = hb.createBlob(ttfFile);
    const face = hb.createFace(blob, 0);
    blob.destroy();
    const font = hb.createFont(face);
    return makeImage(hb, font, text, options);
};
