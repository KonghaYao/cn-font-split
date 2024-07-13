import { isBrowser, isDeno, isInWorker } from '../utils/env';
import { SystemAssetsMap } from './AssetsMap';
import nodePresets from './node/nodeAssets.json';
const browserPresets = {
    'hb-subset.wasm': './hb-subset.wasm',
    'cn_char_rank.dat': './cn_char_rank.dat',
    'template.html': './template.html',
    'unicodes_contours.dat': './unicodes_contours.dat',
};
export const Assets = new SystemAssetsMap(
    isDeno || isBrowser || isInWorker ? browserPresets : nodePresets,
);
