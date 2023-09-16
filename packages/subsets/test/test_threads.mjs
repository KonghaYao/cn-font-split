import fs from 'fs-extra';
import { fontSplit } from '../dist/index.js';
// const buffer = await fs.readFile(
//     "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
// );
fs.emptyDirSync('./temp');
fontSplit({
    destFold: './temp',
    // FontPath: '../demo/public/SmileySans-Oblique.ttf',
    FontPath: './test/temp/江西拙楷.ttf',
    // FontPath: './test/temp/MaokenAssortedSans1.30.ttf',
    // FontPath: './test/temp/字魂扁桃体.ttf',
    // FontPath: './test/temp/京華老宋体v1.007.ttf',
    // FontPath: './test/temp/SourceHanSerifSC.ttf',

    targetType: 'woff2',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    previewImage: {},
    // autoChunk: false,
    // subsets: [[31105, 8413]],
    threads: {},
});
