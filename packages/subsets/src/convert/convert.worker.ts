import { expose, transfer } from "comlink";
import { convert } from "./font-converter";
import { FontType } from "../detectFormat";
export class API {
    async convert(buffer: Uint8Array, targetType: FontType) {
        const res = await convert(buffer, targetType);
        return transfer(res, [res.buffer]);
    }
}
expose(new API());
