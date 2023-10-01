import { Font } from '@konghayao/opentype.js';
export const makeImage = async (
    f: Font,
    text = "中文网字计划\nThe Project For Web"
) => {
    const bounding = { height: 0, width: 0 };
    const padding = 12;
    const path = text.split('\n').map((i, index) => {
        const p = f.getPath(i, 12, (index + 1) * 140, 120);
        bounding.width = Math.max(bounding.width, p.getBoundingBox().x2);
        return p.toSVG(2);
    });
    bounding.height = 140 * path.length + (path.length + 1) * padding;
    bounding.width += (path.length + 1) * padding;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounding.width
        }" height="${bounding.height}">${path.join('')}</svg>`;
};
