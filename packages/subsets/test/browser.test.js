import { test } from 'vitest';
import { fontSplit, Assets } from '../dist/browser/index.js';

test('Browser Test For cn-font-split', async () => {
    Assets.pathTransform = (innerPath) =>
        innerPath.replace('./', 'http://127.0.0.1:9000/');
    console.log(Assets)
    const files = []
    await fontSplit({
        destFold: '',
        FontPath: 'https://cdn.jsdelivr.net/gh/KonghaYao/chinese-free-web-font-storage/packages/dyh/fonts/SmileySans-Oblique.ttf',
        // FontPath: './test/temp/MaokenAssortedSans1.30.ttf',
        // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
        // previewImage: {},
        outputFile(name, data) {
            files.push(name)
        },
    });
    console.log(files)
}, 1000000);
