import fs from 'fs-extra';
import { fontSplit } from '../dist/index.js';
// const buffer = await fs.readFile(
//     "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
// );
fs.emptyDirSync('./temp');
fontSplit({
    destFold: './temp',
    // FontPath: '../demo/public/SmileySans-Oblique.ttf',
    FontPath: './test/temp/MaokenAssortedSans1.30.ttf',

    targetType: 'woff2',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    previewImage: {},
    // autoChunk: false,
    // subsets: [[31105, 8413]],
    threads: {},
});
