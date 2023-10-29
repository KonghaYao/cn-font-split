import fs from 'fs-extra';
import _ from 'lodash-es'
import { fontSplit, convert } from '@konghayao/cn-font-split';
import { chunk } from 'lodash-es';
const features = fs.readJSONSync('./FeatureConfig.json');
const allKey = new Set();

features.forEach((i) => {
    if (allKey.has(i.featureKey)) throw new Error('重复键 ' + i.featureKey);
    allKey.add(i.featureKey);
});

const getFont = _.memoize((fontLink) => {
    return fetch(fontLink).then((res) => res.arrayBuffer());
})

// fs.emptyDirSync('./temp');
for (const i of features) {
    console.log(i.featureKey);
    if (fs.existsSync('./temp/' + i.featureKey)) continue
    const buffer = await getFont(i.fontLink)
    fs.outputFileSync('./temp/' + i.featureKey + "/" + i.featureKey + i.fontLink.replace(/.*\.(.*?)/g, '.$1'), new Uint8Array(buffer))
    const b = await convert(new Uint8Array(buffer), 'ttf');
    const charset = i.splitText.split('').filter(Boolean).map((i) => i.charCodeAt(0))
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
                unicodes: true
            }
        },
        targetType: 'woff2',
        subsets: chunk(
            charset,
            i.splitCount ?? 3
        ),
        subsets: [charset],
    });

}

fs.copyFileSync('../demo/public/SmileySans-Oblique.ttf', './temp/SmileySans-Oblique.ttf')