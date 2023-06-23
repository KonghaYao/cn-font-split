import WORKER_URL from "omt:./convert.worker";
import workerpool from "workerpool";
import { reactiveResolve } from "../utils/relativeResolve";
export class ConvertManager {
    pool = workerpool.pool(reactiveResolve("./" + WORKER_URL));

    destroy(): void {
        this.pool.terminate();
    }
}
