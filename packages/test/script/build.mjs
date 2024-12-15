import fs from 'fs-extra';
import _ from 'lodash-es';
import { convert } from './convert.mjs';
// import { fontSplit } from 'cn-font-split/dist/bun/index.js';
import { fontSplit } from 'cn-font-split/dist/node/index.js';
const features = fs.readJSONSync('./FeatureConfig.json');
const allKey = new Set();

features.forEach((i) => {
    if (allKey.has(i.featureKey)) throw new Error('重复键 ' + i.featureKey);
    allKey.add(i.featureKey);
});

// fs.emptyDirSync('./temp');
for await (const i of features) {
    console.log(i.featureKey);
    // if (fs.existsSync('./temp/' + i.featureKey)) continue
    const buffer = fs.readFileSync(
        './temp/' +
        i.featureKey +
        '/' +
        i.featureKey +
        i.fontLink.replace(/.*\.(.*?)/g, '.$1'),
    );
    const b = await convert(new Uint8Array(buffer), 'ttf');
    const config = {
        out_dir: './temp/' + i.featureKey,
        input: b,
        css: {
            font_family: i.featureKey + '-demo',
            comment_base: true
            // comment: {
            //     base: false,
            //     name_table: false,
            //     unicodes: true,
            // },
        },
    }
    // console.log(config);
    await fontSplit(config);
}
// await endFontSplit()