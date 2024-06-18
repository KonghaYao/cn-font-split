import { readMetrics } from 'fontaine';
import { glob } from 'glob';
import { pathToFileURL } from 'url';

const fonts = glob.globSync('./fonts/**/*.{otf,ttf}', { absolute: true });

let code = '';

const codeTemplate = (key, metrics) => `
export const ${key.replace('-', '')} = ${JSON.stringify(metrics)};`;

for (const font of fonts) {
    const metrics = await readMetrics(pathToFileURL(font));

    code += codeTemplate(font.split('/').pop().split('.')[0], metrics);
}

// const metrics = await readMetrics(
//     pathToFileURL('../../demo/public/SmileySans-Oblique.ttf'),
// );
// const fontFace = generateFontFace(metrics, {
//     name: '_fallback',
//     font: 'NotoSerifSC-Regular',
//     metrics: fallbackMetrics,
// });

import fs from 'fs';
fs.writeFileSync('./metrics.mjs', code);
fs.writeFileSync('./metrics.ts', code);
