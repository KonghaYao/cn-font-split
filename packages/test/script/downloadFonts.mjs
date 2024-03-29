import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');
import _ from 'lodash-es';
import { fontStore } from './FileStore.mjs';
await import('./downloadFont/getKozuka.mjs')
await import('./downloadFont/getNotoColorEmoji.mjs')
// 下载测试所需要的所有字体
for (const i of features) {
    fontStore.get(i.fontLink).then((resPath) => {
        const path =
            './temp/' +
            i.featureKey +
            '/' +
            i.featureKey +
            i.fontLink.replace(/.*\.(.*?)/g, '.$1');
        fs.createSymlinkSync(resPath, path, 'file');
    }).catch(e => {
        console.log('download Error ', i.fontLink, e)
    });
}


fs.createSymlinkSync(
    '../demo/public/SmileySans-Oblique.ttf',
    './temp/font/SmileySans-Oblique.ttf',
);
