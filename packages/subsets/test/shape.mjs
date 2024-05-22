import fs from 'fs-extra';
import { fontSplit } from '../dist/index.js';
import crypto from 'node:crypto'

fs.emptyDirSync('./temp/node');
fontSplit({
    destFold: './temp/node',
    // FontPath: '../demo/public/SmileySans-Oblique.ttf',
    FontPath: './test/temp/Yozai-Light.ttf',// 不折行问题
    FontPath: './test/temp/qiji-fallback.ttf',// 大小问题
    FontPath: './test/temp/随峰体.ttf',// 大小问题

    targetType: 'woff2',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    previewImage: {},
    chunkSize: 70 * 1024,
    css: {
        // fontWeight: false
        // localFamily: false,
        // comment: false,
        // comment: {
        //     base: false,
        //     nameTable: false,
        //     unicodes: true
        // }
    }
    // autoChunk: false,
    // subsets: [[31105, 8413]],
    // threads: {},
    // renameOutputFont: '[hash:10][ext]',
    // renameOutputFont: '[index][ext]',
    // renameOutputFont({ transferred, ext, index }) {
    //     const algorithm = 'sha256'
    //     const hash = crypto.createHash(algorithm).update(transferred).digest('hex')
    //     // return index.toString() + ext // index 命名
    //     return hash.slice(0, 6) + ext // 短 hash 命名
    // }
});
