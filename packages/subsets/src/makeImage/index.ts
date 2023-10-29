import { HB } from '../hb';
function shape(hb: HB.Handle, font: HB.Font, text: string) {
    font.setScale(100, -100);

    const buffer = hb.createBuffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    // buffer.setDirection('ltr');
    hb.shape(font, buffer);
    const result = buffer.json();
    const glyphs = result.map(function (x) {
        return { ...x, glyph: font.glyphToPath(x.g) };
    });

    buffer.destroy();

    return glyphs;
}
export const makeImage = (
    hb: HB.Handle,
    font: HB.Font,
    input = '中文网字计划\nThe Project For Web',
    { baseLine = 24, lineHeight = 1 } = {},
) => {
    const path = shape(hb, font, input);
    const lineHeightPx = 100 * lineHeight;
    const bounding = { height: lineHeightPx, width: 0 };
    const maxBounding = { height: 0, width: 0 };
    const paths = path.map((i) => {
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
