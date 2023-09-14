import WORKER_URL from "omt:./convert.worker";
import { WorkerPool, WorkerPoolOptions, pool } from "workerpool";
import { WorkerURLWrapper } from "../utils/WorkerURLWrapper";
export class ConvertManager {
    pool: WorkerPool
    constructor(options?: WorkerPoolOptions) {
        this.pool = pool(WorkerURLWrapper("./" + WORKER_URL), { ...options, workerOpts: { type: 'module' } });
    }

    destroy(): void {
        this.pool.terminate();
    }
}
