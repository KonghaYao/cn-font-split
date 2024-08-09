import { isBrowser, isDeno, isInWorker } from '../utils/env';
import { SystemAssetsMap } from './AssetsMap';
import { browserPresets } from './browser/browserPresets';
import nodePresets from './node/nodeAssets.json';
export const Assets = new SystemAssetsMap(
    isDeno || isBrowser || isInWorker ? browserPresets : nodePresets,
);
