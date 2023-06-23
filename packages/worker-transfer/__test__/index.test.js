import { Poster, Transfer } from "../dist/index.js";
import { Worker } from "worker_threads";
const w = new Worker(new URL("./index.worker.test.js", import.meta.url), {
    type: "module",
});
const api = new Poster(nodeEndpoint(w), {});
await api.init();
console.time("开始 send");
const data = await api.exec("send", new Transfer(new Uint8Array(1024 * 70)));
// console.log(data);
console.timeEnd("开始 send");
api.w.terminate();
