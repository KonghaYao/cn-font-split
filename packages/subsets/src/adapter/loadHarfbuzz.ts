import { isNode } from "../utils/env.js";

const NodeLoad = async (input?: string) => {
    const { readFile } = await import("fs/promises");
    /**@ts-ignore */
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);

    const path = require.resolve("@konghayao/harfbuzzjs/hb-subset.wasm");

    console.log(path);
    return WebAssembly.instantiate(await readFile(input || path));
};
export const loadHarbuzzAdapter = async (
    input?: string | Response | Buffer
) => {
    if (isNode) {
        if (typeof input === "string") {
            return NodeLoad(input);
        } else if (input === undefined) {
            return NodeLoad();
        }
    }
    if (input instanceof Response) {
        return WebAssembly.instantiateStreaming(input);
    } else if (input instanceof Buffer) {
        return WebAssembly.instantiate(input);
    }

    throw new Error("loadHarbuzzAdapter");
};
