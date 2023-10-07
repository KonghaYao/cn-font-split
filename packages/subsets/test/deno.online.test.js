import 'https://deno.land/x/process@v0.3.0/mod.ts';

import {
    fontSplit,
    Assets,
    DenoAdapter,
} from 'https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split@4.8.2/dist/browser/index.js';

await DenoAdapter();
const root = 'https://esm.sh/@konghayao/cn-font-split@4.8.2/dist/browser/';
Assets.pathTransform = (innerPath) => innerPath.replace('./', root);
console.log(Assets);

fontSplit({
    destFold: './temp',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',
    targetType: 'woff2',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
    threads: {},
});
