import { expose, transfer } from "comlink";
import { convert } from "./font-converter";
import { FontType } from "../detectFormat";
import { worker, Transfer } from "workerpool";
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
