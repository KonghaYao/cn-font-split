import { Transfer } from "./Transfer.js";

export interface SendPayload<T extends unknown[] = unknown[]> {
    key: string;
    type: "get" | "set" | "apply";
    args?: T;
}
const randomID = () => {
    return Date.now().toString() + Math.random();
};
export abstract class BaseCommunication<LocalAPI extends Object> {
    abstract port: MessagePort;
    abstract api: LocalAPI;
    protected waitForReturn<Data>(payload: SendPayload) {
        return new Promise((res) => {
            const id = randomID();
            const transferable: Transferable[] = [];
            payload.args = payload.args?.map((i) => {
                if (i instanceof Transfer) {
                    transferable.push(i.transferable);
                    return i.value;
                }
                return i;
            });

            const handle = (ev: MessageEvent<{ id: string; data: Data }>) => {
                if (ev.data.id === id) {
                    res(ev.data.data);
                    this.port.removeEventListener("message", handle);
                }
            };
            this.port.addEventListener("message", handle);
            this.port.postMessage({ id, ...payload }, transferable);
        });
    }

    protected listenToPort() {
        this.port.start();
        this.port.addEventListener("message", async (e) => {
            const res = await this.receiveFromPort(e.data);
            this.port.postMessage({ id: e.data.id, data: res });
        });
    }
    /** 被动接收变量 */
    protected receiveFromPort(payload: SendPayload) {
        switch (payload.type) {
            case "apply":
                /**@ts-ignore */
                return this.api[payload.key].apply(this.api, payload.args);
        }
    }
}
