/** 包裹数据，使之在线程中穿梭 */
export class Transfer<T extends Transferable | Uint8Array> {
    constructor(public value: T) {
        if ((value as any)?.buffer instanceof ArrayBuffer) {
            this.transferable = (value as any).buffer;
        } else {
            this.transferable = value;
        }
    }
    transferable!: Transferable;
}
