import fs from 'fs-extra';
import _ from 'lodash-es'
import { fontSplit, convert } from '@konghayao/cn-font-split';
import { chunk } from 'lodash-es';
const features = fs.readJSONSync('./FeatureConfig.json');
const allKey = new Set();

// fs.emptyDirSync('./temp')
features.forEach((i) => {
    if (allKey.has(i.featureKey)) throw new Error('重复键 ' + i.featureKey);
    allKey.add(i.featureKey);
});

const getFont = _.memoize((fontLink)=>{
    return fetch(fontLink).then((res) => res.arrayBuffer());
})

// fs.emptyDirSync('./temp');
for (const i of features) {
    console.log(i.featureKey);
    if(fs.existsSync('./temp/' + i.featureKey)) continue
    const buffer = await getFont(i.fontLink)
    const b = await convert(new Uint8Array(buffer), 'ttf');
    await fontSplit({
        destFold: './temp/' + i.featureKey,
        FontPath: Buffer.from(b),
        reporter: false,
        testHTML: false,
        css: {
            fontFamily: i.featureKey + '-demo',
        },
        targetType: 'woff2',
        subsets: chunk(
            i.splitText.split('').map((i) => i.charCodeAt(0)),
            i.splitCount ?? 3
        ),
    });
}
