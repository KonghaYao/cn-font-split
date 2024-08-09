import {
    fontSplit,
    Assets,
    DenoAdapter,
} from '../dist/cn-font-split.browser.js';
import fs from 'https://esm.sh/fs-extra';
fs.emptyDirSync('./temp/deno');
await DenoAdapter();
Assets.pathTransform = (innerPath) =>
    innerPath.replace(
        './',
        './dist/',
    );
console.log(Assets);
fontSplit({
    destFold: './temp/deno',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',
    // FontPath: './test/temp/MaokenAssortedSans1.30.ttf',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
});
