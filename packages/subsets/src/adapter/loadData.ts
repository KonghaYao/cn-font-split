import { isNode } from "src/utils/env";

export const AssetsMap = {
    "hb-subset.wasm": "node_modules/@konghayao/harfbuzzjs/hb-subset.wasm",
    "cn_char_rank.dat": "data/cn_char_rank.dat",
    "unicodes_contours.dat":
        "node_modules/@chinese-fonts/font-contours/data/unicodes_contours.dat",
};

/** 设置内部访问的数据 */
export const defineAssetsMap = (newObj: Partial<typeof AssetsMap>) => {
    return Object.assign(AssetsMap, newObj);
};

interface AssetsLoader {
    (path: string): Promise<Buffer>;
}

const NodeLoader: AssetsLoader = async (path: string) => {
    const fs = await import("fs/promises");
    return fs.readFile(path);
};
import { Buffer } from "buffer";
const FetchLoader: AssetsLoader = async (path: string) => {
    return fetch(path)
        .then((res) => res.arrayBuffer())
        .then((res) => Buffer.from(res));
};

/** 通过文件系统获取文件的方法，需要进行适配才能在特定的平台使用 */
export const loadData = async (tag: keyof typeof AssetsMap | string) => {
    /** @ts-ignore */
    const path = AssetsMap[tag] ?? tag;
    if (isNode) {
        return NodeLoader(path);
    }
    return FetchLoader(path);
};
