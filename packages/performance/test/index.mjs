import { fontSplit, getSubsetsFromCSS } from '@konghayao/cn-font-split';
import fs from 'node:fs';
const noto = fs.readFileSync('./css/noto.css', 'utf-8');
await fontSplit({
    destFold: './temp/noto',
    FontPath: '../demo/public/NotoSerifSC-Regular.ttf',
    subsets: getSubsetsFromCSS(noto),
    chunkSize: 60 * 1024,
    unicodeRank: [],
});
await fontSplit({
    destFold: './temp/base',
    FontPath: '../demo/public/NotoSerifSC-Regular.ttf',
    chunkSize: 60 * 1024,
});
