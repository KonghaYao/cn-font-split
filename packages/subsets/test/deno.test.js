import 'https://deno.land/x/process@v0.3.0/mod.ts';

import { fontSplit, Assets, DenoAdapter } from '../dist/browser/index.js';

await DenoAdapter();
Assets.pathTransform = (innerPath) =>
    innerPath.replace('./', './dist/browser/');
console.log(Assets);
fontSplit({
    destFold: './temp',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',
    // FontPath: './test/temp/MaokenAssortedSans1.30.ttf',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
});
