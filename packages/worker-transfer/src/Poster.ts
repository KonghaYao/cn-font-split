import { BaseCommunication } from "./BaseCommunication.js";

/** 这是一个主线程内部封装 worker 的函数 */
export class Poster<
    RemoteAPI extends Record<string, (...args: any[]) => any>,
    API extends Object
> extends BaseCommunication<API> {
    port!: MessagePort;

    constructor(public w: Worker, public api: API) {
        super();
    }
    init() {
        return new Promise<this>((resolve, reject) => {
            console.time("完成线程搭建");
            const id = setTimeout(() => reject("Thread not responding"), 2000);
            const handle = (e: MessageEvent<MessagePort>) => {
                if (e.data instanceof MessagePort) {
                    console.timeEnd("完成线程搭建");
                    this.port = e.data;
                    this.port.start();
                    clearTimeout(id);
                    this.w.removeEventListener("message", handle);
                    resolve(this);
                }
            };
            this.w.addEventListener("message", handle);
        });
    }

    async exec<K extends keyof RemoteAPI>(key: K, ...args: unknown[]) {
        return this.waitForReturn<ReturnType<RemoteAPI[K]>>({
            args,
            key: key.toString(),
            type: "apply",
        });
    }
}
