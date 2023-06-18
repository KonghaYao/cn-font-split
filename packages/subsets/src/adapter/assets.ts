import { isBrowser } from "../utils/env";
import { AssetsMap } from "./AssetsMap";
import node from "./nodeAssets.json";
const input = {
    node,
    browser: {
        "hb-subset.wasm": "./hb-subset.wasm",
        "cn_char_rank.dat": "./cn_char_rank.dat", // 注意，所有的node相对定位的出发点为 dist 文件夹
        "unicodes_contours.dat": "./unicodes_contours.dat",
    },
};
export const Assets = new AssetsMap(isBrowser ? input.browser : input.node);
