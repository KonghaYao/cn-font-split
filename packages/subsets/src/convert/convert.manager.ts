import WORKER_URL from "omt:./convert.worker";
import { pool } from "workerpool";
import { WorkerURLWrapper } from "../utils/WorkerURLWrapper";
export class ConvertManager {
    pool = pool(WorkerURLWrapper("./" + WORKER_URL));


    destroy(): void {
        this.pool.terminate();
    }
}
