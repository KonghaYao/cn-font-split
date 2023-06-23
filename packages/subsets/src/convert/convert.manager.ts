import { Remote, releaseProxy, wrap } from "comlink";
import { Pool } from "../utils/Pool";
import type { API } from "./convert.worker";
import WORKER_URL from "omt:./convert.worker";
import workerpool from "workerpool";
import { fileURLToPath } from "node:url";
const workerpath = fileURLToPath(new URL("./" + WORKER_URL, import.meta.url));
console.log(workerpath);
export class ConvertManager {
    pool = workerpool.pool(workerpath);

    destroy(): void {
        this.pool.terminate();
    }
}
