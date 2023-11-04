import fs from 'fs-extra';
import _ from 'lodash-es'
import { convert } from '@konghayao/cn-font-split';
import shelljs from 'shelljs'
const features = fs.readJSONSync('./FeatureConfig.json');

// 生成 harfbuzz 对照测试的样例

const command = (input, output, text) => `hb-subset --font-file=${input} --output-file=${output} --layout-scripts=* --layout-features=* --text="${text}"`

// fs.emptyDirSync('./temp');
for (const i of features) {
    const head = `./temp/${i.featureKey}/${i.featureKey}`
    const buffer = fs.readFileSync(
        head +
        i.fontLink.replace(/.*\.(.*?)/g, '.$1'),
    );
    const b = await convert(new Uint8Array(buffer), 'ttf');
    fs.writeFileSync(head + `_hb.ttf`, b)
    shelljs.exec(command(head + "_hb.ttf", head + '-hb.ttf', i.splitText))
}
