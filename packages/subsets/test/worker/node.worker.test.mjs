import { wrap, releaseProxy } from "comlink";
import { Worker } from "worker_threads";
import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";
const w = new Worker("./test/worker/node.in.worker.test.mjs");
const worker = wrap(nodeEndpoint(w));
await worker.fontSplit({
    destFold: "./temp",
    FontPath: "../../fonts/SmileySans-Oblique.ttf",
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
});
worker[releaseProxy]();
