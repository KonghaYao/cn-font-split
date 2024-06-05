import type { Plugin } from 'vite';
import {
    SubsetBundlePlugin,
    SubsetBundlePluginConfig,
    SubsetUtils,
} from './subset/SubsetBundlePlugin.js';

export default function split(config: Partial<SubsetBundlePluginConfig>): Plugin {
    const pluginStore = new Map<string, SubsetBundlePlugin>()
    let UnionConfig: SubsetBundlePluginConfig
    return <Plugin>{
        name: 'vite-plugin-font',
        enforce: 'pre',

        async configResolved(c) {
            const scanFiles = typeof config.scanFiles === 'object' && !(config.scanFiles instanceof Array) ? config.scanFiles : {
                default: config.scanFiles!
            }
            UnionConfig = { cacheDir: c.cacheDir, ...config, scanFiles }
            await SubsetUtils.emptySubsetsDir(UnionConfig)
            const plugin = new SubsetBundlePlugin(UnionConfig)
            await plugin.createSubsets()
            pluginStore.set('default', plugin)
            console.log(
                'vite-plugin-font | cache dir | ' + UnionConfig.cacheDir,
            );
        },
        async load(id) {
            if ([/\.otf/, /\.ttf/].some((i) => i.test(id))) {
                const { isSubset, searchParams } = SubsetUtils.isSubsetLink(id)
                const key = searchParams.get('key') ?? 'default'
                let plugin = pluginStore.get(key)
                if (!plugin) {
                    plugin = new SubsetBundlePlugin(UnionConfig)
                    plugin.key = key
                    await plugin.createSubsets();
                    pluginStore.set(key, plugin)
                }
                await plugin.createBundle(id, isSubset ? "subsets" : "full");
                return plugin.createSourceCode(id);
            }
        },
    };
}
