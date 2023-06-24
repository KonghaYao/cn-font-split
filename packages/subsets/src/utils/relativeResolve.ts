//ifdef node
import { fileURLToPath } from "node:url";
//endif
import { isNode } from "./env";
export const reactiveResolve = (path: string) => {
    // ! 可能因 import.meta.url 报错
    const url = new URL(path, import.meta.url);

    return isNode ? fileURLToPath(url.toString()) : url.toString();
};
