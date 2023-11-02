import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');
import _ from 'lodash-es';
import { FileStore, fontStore } from './FileStore.mjs';

// 下载测试所需要的所有字体
for (const i of features) {
    fontStore
        .get(i.fontLink)
        .then((buffer) => {
            const path =
                './temp/' +
                i.featureKey +
                '/' +
                i.featureKey +
                i.fontLink.replace(/.*\.(.*?)/g, '.$1');
            fs.outputFileSync(path, new Uint8Array(buffer));
        });
}
