import fs from 'fs-extra';
import { fontSplit, convert } from '@konghayao/cn-font-split';
import { chunk } from 'lodash-es';
const features = fs.readJSONSync('./FeatureConfig.json');
// fs.emptyDirSync('./temp');
for (const i of features) {    
    console.log(i.outputKey)
    const buffer = await fetch(i.fontLink).then((res) => res.arrayBuffer());
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
            3
        ),
    });
}
