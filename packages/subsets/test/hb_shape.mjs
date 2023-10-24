function shape(hb, font, text) {
    font.setScale(100, -100);

    const buffer = hb.createBuffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    // buffer.setDirection('ltr'); // optional as can be set by guessSegmentProperties also

    hb.shape(font, buffer);
    const result = buffer.json(font);
    const glyphs = result.map(function (x) {
        return { ...x, glyph: font.glyphToPath(x.g) };
    });

    buffer.destroy();

    return glyphs;
}
import fs from 'fs';
import { hbjs } from '../dist/index.js';
const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');

const input = '中文网\n字计划\ncodfidsjfld';
const result = await WebAssembly.instantiate(
    fs.readFileSync('./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm')
);

const hb = hbjs(result.instance);
var blob = hb.createBlob(new Uint8Array(buffer));
var face = hb.createFace(blob, 0);
var font = hb.createFont(face);
const makeImage = (hb, font, input, { baseLine = 24, lineHeight = 1 } = {}) => {
    const path = shape(hb, font, input);
    const lineHeightPx = 100 * lineHeight;
    let bounding = { height: lineHeightPx, width: 0 };
    const maxBounding = { height: 0, width: 0 };
    const paths = path.map((i, index) => {
        if (i.g === 0) {
            bounding.height += lineHeightPx;
            bounding.width = 0;
            maxBounding.height = Math.max(maxBounding.height, bounding.height);
            maxBounding.width = Math.max(maxBounding.width, bounding.width);
            return;
        }
        const path = `<path transform="translate(${i.dx + bounding.width} ${
            bounding.height + i.dy
        })" d="${i.glyph}"></path>`;
        bounding.width += i.ax;
        maxBounding.width = Math.max(maxBounding.width, bounding.width);
        return path;
    });

    return `<svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${
        bounding.width
    }" height="${bounding.height}" viewBox="${0} ${0} ${
        bounding.width + baseLine
    } ${bounding.height + baseLine}">${paths.join('')}</svg>`;
};
const total = makeImage(hb, font, input, { lineHeight: 1.1 });
font.destroy();
face.destroy();
blob.destroy();
fs.writeFileSync('./temp/1.svg', total);
