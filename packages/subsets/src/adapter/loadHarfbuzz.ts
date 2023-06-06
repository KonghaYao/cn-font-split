import { isNode } from "../utils/env.js";

/** 当检查到为 node 环境时，使用此功能 */
const NodeLoad = async (input?: string) => {
    const { readFile } = await import("fs/promises");
    /**@ts-ignore */
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);

    const path = require.resolve("@konghayao/harfbuzzjs/hb-subset.wasm");

    return WebAssembly.instantiate(await readFile(input || path));
};

/** 无视平台加载 */
export const loadHarbuzzAdapter = async (
    input?: string | Response | ArrayBuffer
) => {
    if (isNode) {
        if (typeof input === "string") {
            return NodeLoad(input);
        } else if (input === undefined) {
            return NodeLoad();
        }
    }
    if (typeof input === "string") {
        return WebAssembly.instantiateStreaming(fetch(input));
    } else if (input instanceof Response) {
        return WebAssembly.instantiateStreaming(input);
    } else if (input instanceof ArrayBuffer) {
        return WebAssembly.instantiate(input);
    }

    throw new Error("loadHarbuzzAdapter");
};
