import { BoundingBox, parse } from 'opentype.js';
import fs from 'fs/promises';
const buffer = await fs.readFile('./test/temp/江西拙楷.ttf');
const f = parse(buffer.buffer);
// opentype 文本渲染插件
const input = '中文网\n字计划\ncodfidsjfld';
let bounding = { height: 0, width: 0 };
const padding = 12;
const path = input.split('\n').map((i, index) => {
    const p = f.getPath(i, 12, (index + 1) * 140, 120);
    bounding.width = Math.max(bounding.width, p.getBoundingBox().x2);
    return p.toSVG();
});
bounding.height = 140 * path.length + (path.length + 1) * padding;
bounding.width += (path.length + 1) * padding;
const total = `<svg xmlns="http://www.w3.org/2000/svg" width="${
    bounding.width
}" height="${bounding.height}">
${path.join('')}
</svg>`;
fs.writeFile('./test/temp/1.svg', total);
