import fs from 'fs-extra';
import { Font } from 'fonteditor-core';

const path = [
    './temp/字魂扁桃体.ttf',
    '../../demo/public/SmileySans-Oblique.ttf',
];
for (const p of path) {
    const buffer = fs.readFileSync(p);
    const f = Font.create(buffer);
    console.log(f.get());
}
