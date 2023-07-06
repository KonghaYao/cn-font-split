import { convert } from "./font-converter";
import type { FontType } from "../utils/detectFormat";
import { worker, Transfer } from "workerpool";
// 欺骗 环境，认为是 classic worker
!globalThis.importScripts && (globalThis.importScripts = (...args: string[]) => {
    console.warn('触发 importScripts 的伪装，可能导致 bug，', args)
});


//ifdef browser
import { DenoAdapter } from "../adapter/deno/index";
import '../adapter/browser/URL.shim' // 为了防止全局状态中 base 出现 blob 而导致的 URL 解析错误
await DenoAdapter();
//endif

export class API {
    ready() {
        return true;
    }
    async convert(buffer: Uint8Array, targetType: FontType) {

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
