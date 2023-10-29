import fs from 'fs-extra'
const features = fs.readJSONSync('./FeatureConfig.json');
import _ from 'lodash-es'
fs.emptyDirSync('./temp/font');

const getFont = _.memoize((fontLink) => {
    return fetch(fontLink).then((res) => res.arrayBuffer());
})

// 下载测试所需要的所有字体
features.map(i =>
    getFont(i.fontLink)
        .then(buffer => {
            fs.outputFileSync('./temp/font/' + i.featureKey + "/" + i.featureKey + i.fontLink.replace(/.*\.(.*?)/g, '.$1'), new Uint8Array(buffer))
        }))
fs.copyFileSync('../demo/public/SmileySans-Oblique.ttf', './temp/font/SmileySans-Oblique.ttf')