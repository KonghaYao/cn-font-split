import { AssetsMap } from "./AssetsMap";

export const Assets = new AssetsMap({
    "hb-subset.wasm": "@konghayao/harfbuzzjs/hb-subset.wasm",
    "cn_char_rank.dat": "&../data/cn_char_rank.dat", // 注意，所有的node相对定位的出发点为 dist 文件夹
    "unicodes_contours.dat":
        "@chinese-fonts/font-contours/data/unicodes_contours.dat",
});
