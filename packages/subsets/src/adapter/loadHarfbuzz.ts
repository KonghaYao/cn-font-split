import { isDeno, isNode } from '../utils/env';
import { Assets } from './assets';
/** 无视平台加载 harfbuzz */
export const loadHarbuzzAdapter = async (input = 'hb-subset.wasm') => {
    if (isNode || isDeno) {
        return WebAssembly.instantiate(await Assets.loadFileAsync(input));
    }
    return WebAssembly.instantiateStreaming(Assets.loadFileResponse(input));
};
