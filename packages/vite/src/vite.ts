import type { Plugin } from 'vite';
import {
    SubsetBundlePlugin,
    SubsetBundlePluginConfig,
} from './subset/SubsetBundlePlugin.js';
export default function split(config: Partial<SubsetBundlePluginConfig>): Plugin {
    let plugin: SubsetBundlePlugin
    return <Plugin>{
        name: 'vite-plugin-font',
        enforce: 'pre',

        async configResolved(c) {
            plugin = new SubsetBundlePlugin({ cacheDir: c.cacheDir, ...config })
            console.log(
                'vite-plugin-font | cache dir | ' + plugin.config.cacheDir,
            );
        },
        async load(id, options) {
            if ([/\.otf/, /\.ttf/].some((i) => i.test(id))) {
                const { isSubset } = plugin.isSubsetLink(id)
                await plugin.createSubsets(id);
                await plugin.createBundle(id, isSubset ? "subsets" : "full");
                return plugin.createSourceCode(id);
            }
        },
    };
}
