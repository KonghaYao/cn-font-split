/** 转化 Node Worker 为 Web Worker 的形式 */
export function nodeAdapter(NodeWorker: any): Worker {
    const listeners = new WeakMap();
    NodeWorker.addEventListener = (
        _: string,
        eh: Function | { handleEvent: Function }
    ) => {
        const l = (data: any) => {
            if ("handleEvent" in eh) {
                eh.handleEvent({ data } as MessageEvent);
            } else {
                eh({ data } as MessageEvent);
            }
        };
        NodeWorker.on("message", l);
        listeners.set(eh, l);
    };
    NodeWorker.removeEventListener = (_: string, eh: Function) => {
        const l = listeners.get(eh);
        if (!l) {
            return;
        }
        NodeWorker.off("message", l);
        listeners.delete(eh);
    };
    return NodeWorker as any as Worker;
}
