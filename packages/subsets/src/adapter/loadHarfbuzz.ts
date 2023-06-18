import { isNode } from "../utils/env";
import { Assets } from "./assets";
/** 无视平台加载 harfbuzz */
export const loadHarbuzzAdapter = async (
    input: string | Response | ArrayBuffer = "hb-subset.wasm"
) => {
    if (typeof input === "string") {
        if (isNode) {
            return WebAssembly.instantiate(await Assets.loadFileAsync(input));
        }
        return WebAssembly.instantiateStreaming(Assets.loadFileResponse(input));
    } else if (input instanceof Response) {
        return WebAssembly.instantiateStreaming(input);
    } else if (input instanceof ArrayBuffer) {
        return WebAssembly.instantiate(input);
    }

    throw new Error("loadHarbuzzAdapter");
};
