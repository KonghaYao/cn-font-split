import { WorkerAPI } from "../dist/index.js";
import { parentPort } from "worker_threads";
export class API {
    constructor() {
        new WorkerAPI(this, parentPort);
    }
    send(a) {
        return [a.slice().fill(1)];
    }
}
new API();
