import fs from 'fs-extra';
import _ from 'lodash-es'
import { fontSplit, convert } from '@konghayao/cn-font-split';
import { chunk } from 'lodash-es';
const features = fs.readJSONSync('./FeatureConfig.json');
const allKey = new Set();

features.forEach((i) => {
    if (allKey.has(i.outputKey)) throw new Error('重复键 ' + i.outputKey);
    allKey.add(i.outputKey);
});

const getFont = _.memoize((fontLink)=>{
    return fetch(fontLink).then((res) => res.arrayBuffer());
})

// fs.emptyDirSync('./temp');
for (const i of features) {
    console.log(i.outputKey);
    if(fs.existsSync('./temp/' + i.outputKey)) continue
    const buffer = await getFont(i.fontLink)
    const b = await convert(new Uint8Array(buffer), 'ttf');
    await fontSplit({
        destFold: './temp/' + i.outputKey,
        FontPath: Buffer.from(b),
        reporter: false,
        testHTML: false,
        css: {
            fontFamily: i.outputKey + '-demo',
        },
        targetType: 'woff2',
        subsets: chunk(
            i.splitText.split('').map((i) => i.charCodeAt(0)),
            i.splitCount ?? 3
        ),
    });
}
