import fs from 'fs-extra';
import { fontSplit } from '../dist/index.js';

fs.emptyDirSync('./temp');
fontSplit({
    destFold: './temp/node',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',

    targetType: 'woff2',
    previewImage: {},
    chunkSize: 70 * 1024,
});
