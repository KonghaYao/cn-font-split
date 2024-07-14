import { fontSplit, Assets, DenoAdapter } from '../dist/browser/index.js';
import fs from 'https://esm.sh/fs-extra';
fs.emptyDirSync('./temp/deno');
await DenoAdapter();
Assets.pathTransform = (innerPath) =>
    innerPath.replace('./', './dist/browser/');
console.log(Assets);
fontSplit({
    destFold: './temp/deno',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',
    FontPath: './test/temp/也字工厂小石头.ttf',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
});
