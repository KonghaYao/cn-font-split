import fs from 'fs-extra'
const features = fs.readJSONSync('./FeatureConfig.json');
import _ from 'lodash-es'
fs.emptyDirSync('./temp/font');

const getFont = _.memoize((fontLink) => {
    return fetch(fontLink).then((res) => res.arrayBuffer());
})

// 下载测试所需要的所有字体
for (const i of features) {
    const path = './temp/' + i.featureKey + "/" + i.featureKey + i.fontLink.replace(/.*\.(.*?)/g, '.$1')
    if (fs.existsSync(path)) continue
    console.log(i.featureKey)
    await getFont(i.fontLink)
        .then(buffer => {
            fs.outputFileSync(path, new Uint8Array(buffer))
        })
}
