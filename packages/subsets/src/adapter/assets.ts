import { isBrowser, isDeno, isInWorker } from '../utils/env';
import { AssetsMap } from './AssetsMap';
import node from './nodeAssets.json';
const input = {
    // 注意，所有的node相对定位的出发点为 dist 文件夹
    node,
    browser: {
        'hb-subset.wasm': './hb-subset.wasm',
        'cn_char_rank.dat': './cn_char_rank.dat',
        'template.html': './template.html',
        'unicodes_contours.dat': './unicodes_contours.dat',
    },
};
export const Assets = new AssetsMap(
    isDeno || isBrowser || isInWorker ? input.browser : input.node,
);
