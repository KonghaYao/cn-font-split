import { InputTemplate } from '@konghayao/cn-font-split';
import type { Plugin } from 'vite';
import path from 'path';

import { BundlePlugin } from './index.js';
export { default as fontSubsets } from './subset/vite.js'
export default function split(
    config: Partial<
        InputTemplate & {
            cacheDir?: string;
            server?: boolean;
        }
    > = {},
): Plugin {
    const plugin = new BundlePlugin(config);
    return <Plugin>{
        name: 'vite-plugin-font',
        enforce: 'pre',
        configResolved(c) {
            plugin.config.cacheDir =
                config.cacheDir ?? path.resolve(c.cacheDir, './.font/');
            console.log(
                'vite-plugin-font | cache dir | ' + plugin.config.cacheDir,
            );
        },
        async load(id, options) {
            if (['.otf', '.ttf'].some((i) => id.endsWith(i))) {
                await plugin.createBundle(id);
                return plugin.createSourceCode(id);
            }
        },
    };
}
