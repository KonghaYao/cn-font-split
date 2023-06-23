import { BaseCommunication } from "./BaseCommunication.js";

export class WorkerAPI<
    WorkerAPI extends Object
> extends BaseCommunication<WorkerAPI> {
    port!: MessagePort;
    constructor(public api: WorkerAPI, public parentPort: any = globalThis) {
        super();
        this.addPort();
    }
    private addPort() {
        const channel = new MessageChannel();
        this.port = channel.port2;
        this.listenToPort();
        // worker 中不需要添加中间的选项
        /** @ts-ignore */
        this.parentPort.postMessage(channel.port1, [channel.port1]);
    }
}
