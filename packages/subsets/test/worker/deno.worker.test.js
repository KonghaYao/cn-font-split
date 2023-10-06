import { wrap, releaseProxy } from 'https://esm.sh/comlink';
const worker = await wrap(
    new Worker(new URL('./deno.in.worker.test.js', import.meta.url).href, {
        type: 'module',
    })
);
await worker.fontSplit({
    destFold: './temp',
    FontPath: '../../fonts/SmileySans-Oblique.ttf',
    targetType: 'woff2',
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
});
worker[releaseProxy]();
