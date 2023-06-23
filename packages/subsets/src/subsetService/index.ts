import { HB } from "../hb";

import { wrap, Remote, releaseProxy } from "comlink";
let Worker = globalThis.Worker;
//ifdef node
import { Worker as _Worker } from "worker_threads";
import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";
Worker = _Worker as any;
//endif

import type { SubsetAPI } from "./subset.worker";
import { Subset } from "src/interface";
export interface SubsetFontOptions {
    variationAxes?: Record<number, number>;
    preserveNameIds?: number[];
    threads?:
        | false
        | {
              service?: SubsetService;
          };
}
export type ISubsetFont = (
    face: HB.Face,
    subsetUnicode: Subset,
    hb: HB.Handle,
    options: SubsetFontOptions
) => Promise<readonly [Uint8Array | null, Uint32Array]>;
import workerURL from "omt:./subset.worker";
import { fileURLToPath } from "node:url";

abstract class Pool<T> {
    abstract create(): Promise<T>;
    active = new Set<T>();
    idle: T[] = [];
    maxWorkers = 5;
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

export class SubsetService extends Pool<Remote<SubsetAPI>> {
    destroy(): void {
        [...this.idle, ...this.active.values()].forEach((worker) => {
            worker[releaseProxy]();
        });
    }
    async create() {
        let w = new Worker(fileURLToPath(new URL(workerURL, import.meta.url)), {
            type: "module",
        });
        //ifdef node

        w = nodeEndpoint(w as any) as any;
        //endif

        const api = wrap<SubsetAPI>(w);
        await api.init(this.buffer);
        return api;
    }

    constructor(public buffer: Uint8Array) {
        super();
    }
    subsetFont: ISubsetFont = async (_, unicode, __, options) => {
        return this.acquire(async (api) => {
            const tag = Date.now().toString();
            console.time(tag);
            const res = await api.subsetFont(
                unicode,
                JSON.parse(JSON.stringify(options)) as SubsetFontOptions
            );
            console.timeEnd(tag);
            return res;
        });
    };
}
