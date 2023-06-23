import { convert } from "./font-converter";
import { FontType } from "../detectFormat";
import { worker, Transfer } from "workerpool";
import { isDeno } from "../../dist";
// 欺骗 环境，认为是 classic worker
!globalThis.importScripts && (globalThis.importScripts = () => {});
isDeno && (await import("../adapter/deno/shim"));
export class API {
    ready() {
        return true;
    }
    async convert(buffer: Uint8Array, targetType: FontType) {
        console.log(buffer);
        const res = await convert(buffer, targetType);
        return new Transfer(res, [res.buffer]);
    }
}
worker({
    async convert(buffer: Uint8Array, targetType: FontType) {
        const res = await convert(buffer, targetType);
        return new Transfer(res, [res.buffer]);
    },
});
