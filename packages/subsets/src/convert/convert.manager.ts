import WORKER_URL from 'omt:./convert.worker';
import { WorkerPool, WorkerPoolOptions, pool } from 'workerpool';
import { WorkerURLWrapper } from '../utils/WorkerURLWrapper';
export class ConvertManager {
    pool: WorkerPool;
    constructor(options?: WorkerPoolOptions) {
        this.pool = pool(WorkerURLWrapper('./' + WORKER_URL), {
            ...options,
            /** @ts-ignore workerpool 没有最新版本的types导致报错 */
            workerOpts: { type: 'module' },
        });
    }

    destroy(): void {
        this.pool.terminate();
    }
}
