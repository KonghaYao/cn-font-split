import { Pool, WorkerPoolOptions, pool } from 'workerpool';
import { WorkerURLWrapper } from '../utils/WorkerURLWrapper';
import workerURL from './convert.worker?worker&url';
/**
 * 在主线程中管理字体转换 worker 的类
 */
export class ConvertManager {
    pool: Pool;

    constructor(options?: WorkerPoolOptions) {
        // 初始化工作池，指定工作线程的URL和配置选项。
        this.pool = pool(WorkerURLWrapper(workerURL.toString()), {
            ...options,
            workerOpts: { type: 'module' },
        });
    }
    destroy(): void {
        // 终止工作池，释放所有资源。
        this.pool.terminate();
    }
}
