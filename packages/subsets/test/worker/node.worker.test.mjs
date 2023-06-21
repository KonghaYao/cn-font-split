import { spawn, Thread, Worker } from "threads";
const worker = await spawn(new Worker("./node.in.worker.test.mjs"));
await worker.fontSplit({
    destFold: "./temp",
    FontPath: "../../fonts/SmileySans-Oblique.ttf",
    targetType: "woff2",
    // subsets: JSON.parse(await fs.readFile("./subsets/misans.json", "utf-8")),
    // previewImage: {},
});
await Thread.terminate(worker);
