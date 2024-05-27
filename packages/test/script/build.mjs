import fs from 'fs-extra';
import _ from 'lodash-es';
import { fontSplit, convert } from '@konghayao/cn-font-split';
const features = fs.readJSONSync('./FeatureConfig.json');
const allKey = new Set();

features.forEach((i) => {
    if (allKey.has(i.featureKey)) throw new Error('重复键 ' + i.featureKey);
    allKey.add(i.featureKey);
});

// fs.emptyDirSync('./temp');
for (const i of features) {
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
    const charset = i.splitText
        .split('')
        .filter(Boolean)
        .map((i) => i.charCodeAt(0));
    await fontSplit({
        destFold: './temp/' + i.featureKey,
        FontPath: Buffer.from(b),
        reporter: false,
        testHTML: false,
        css: {
            localFamily: false,
            fontFamily: i.featureKey + '-demo',
            comment: {
                base: false,
                nameTable: false,
                unicodes: true,
            },
        },
        autoChunk: false,
        targetType: 'woff2',
        // subsets: chunk(
        //     charset,
        //     i.splitCount ?? 3
        // ),
        subsets: [[...new Set(charset)]],
    });
}
