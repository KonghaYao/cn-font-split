import type { Plugin } from 'vite';
import path from 'path';

import {
    SubsetBundlePlugin,
    SubsetBundlePluginConfig,
} from './SubsetBundlePlugin.js';
export default function split(config: SubsetBundlePluginConfig): Plugin {
    const plugin = new SubsetBundlePlugin(config);
    return <Plugin>{
        name: 'vite-plugin-font-subsets',
        enforce: 'pre',

        async configResolved(c) {
            const hash = await plugin.createSubsets();
            plugin.config.cacheDir = path.resolve(
                config.cacheDir ?? path.resolve(c.cacheDir, './.font/'),
                hash,
            );
            console.log(
                'vite-plugin-font | cache dir | ' + plugin.config.cacheDir,
            );
        },
        async load(id, options) {
            if (['.otf?subsets', '.ttf?subsets'].some((i) => id.endsWith(i))) {
                id = id.split('?')[0];
                await plugin.createBundle(id);
                return plugin.createSourceCode(id);
            }
        },
    };
}
