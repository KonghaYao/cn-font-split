function shape(hb, fontBlob, text) {
    var blob = hb.createBlob(fontBlob);
    var face = hb.createFace(blob, 0);
    // console.log(face.getAxisInfos());
    var font = hb.createFont(face);
    // font.setVariations({ wdth: 200, wght: 700 });
    font.setScale(100, -100); // Optional, if not given will be in font upem

    var buffer = hb.createBuffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    buffer.setDirection('ltr'); // optional as can be set by guessSegmentProperties also

    hb.shape(font, buffer); // features are not supported yet
    var result = buffer.json(font);
    console.log(result);
    // returns glyphs paths, totally optional
    const glyphs = result.map(function (x) {
        return { ...x, glyph: font.glyphToPath(x.g) };
    });

    buffer.destroy();
    font.destroy();
    face.destroy();
    blob.destroy();
    return glyphs;
}
import fs from 'fs';
import { hbjs } from '../dist/index.js';
const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');

const input = '中文网\n字计划\ncodfidsjfld';
const result = await WebAssembly.instantiate(
    fs.readFileSync('./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm')
);
const path = shape(hbjs(result.instance), new Uint8Array(buffer), input);
let bounding = { height: 100, width: 0 };
const maxBounding = { height: 0, width: 0 };
const paths = path.map((i, index) => {
    if (i.g === 0) {
        bounding.height += 100;
        bounding.width = 0;
        maxBounding.height = Math.max(maxBounding.height, bounding.height);
        maxBounding.width = Math.max(maxBounding.width, bounding.width);
        return;
    }
    // i.ax = -i.ax;
    const path = `<path transform="translate(${i.dx + bounding.width} ${
        bounding.height + i.dy
    })" d="${i.glyph}"></path>`;
    bounding.width += i.ax;
    maxBounding.width = Math.max(maxBounding.width, bounding.width);
    return path;
});

const total = `<svg  xmlns="http://www.w3.org/2000/svg"
xmlns:xlink="http://www.w3.org/1999/xlink" width="${bounding.width}" height="${
    bounding.height + 100
}" viewBox="0 0 ${bounding.width} ${bounding.height + 100}">
${paths.join('')}
</svg>`;
fs.writeFileSync('./temp/1.svg', total);
