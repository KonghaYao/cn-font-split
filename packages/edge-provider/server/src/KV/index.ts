import { createStorage } from 'unstorage';
import denoKvDriver from './deno-kv.js';
export const KV = () => {
    return createStorage({
        driver: denoKvDriver({
            prefix: 'font-css-api',
        }),
    });
};
