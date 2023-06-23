export abstract class Pool<T> {
    abstract create(): Promise<T>;
    active = new Set<T>();
    idle: T[] = [];
    maxWorkers = 3;
    pendingWorkers = 0;
    abstract destroy(): void;
    private waitingQueue: ((api: T) => void)[] = [];
    async acquire<Res>(cb: (api: T) => Res) {
        let api!: T;
        if (this.active.size + this.pendingWorkers > this.maxWorkers) {
            // 超过则等候
            api = await new Promise<T>((res, rej) => {
                this.waitingQueue.push(res);
            });
        } else if (this.idle.length) {
            // 有空闲
            console.log("获取空闲");
            api = this.idle.shift()!;
        } else {
            // 申请
            console.log("申请");
            this.pendingWorkers += 1;
            api = await this.create();
        }
        this.active.add(api);
        const res = await cb(api);
        this.active.delete(api);
        if (this.lookWaiting(api)) {
            this.idle.push(api);
        }
        return res;
    }
    private lookWaiting(api: T) {
        if (this.waitingQueue.length) {
            this.waitingQueue.shift()!(api);
            return;
        }
        return api;
    }
}
