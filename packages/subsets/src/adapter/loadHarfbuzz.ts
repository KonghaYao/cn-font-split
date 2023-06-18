import { isNode } from "../utils/env";
import { Assets } from "./assets";
/** 当检查到为 node 环境时，使用此功能 */
const NodeLoader = async (input?: string) => {
    const buffer = await Assets.loadFileAsync(input ?? "hb-subset.wasm");
    return WebAssembly.instantiate(buffer);
};

/** 无视平台加载 */
export const loadHarbuzzAdapter = async (
    input?: string | Response | ArrayBuffer
) => {
    if (isNode) {
        if (typeof input === "string") {
            return NodeLoader(input);
        } else if (input === undefined) {
            return NodeLoader();
        }
    }
    if (typeof input === "string") {
        return WebAssembly.instantiateStreaming(Assets.loadFileResponse(input));
    } else if (input instanceof Response) {
        return WebAssembly.instantiateStreaming(input);
    } else if (input instanceof ArrayBuffer) {
        return WebAssembly.instantiate(input);
    }

    throw new Error("loadHarbuzzAdapter");
};
