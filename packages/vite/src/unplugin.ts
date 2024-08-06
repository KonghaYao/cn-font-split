import type { UnpluginFactory } from 'unplugin';
import { createUnplugin } from 'unplugin';
import {
    SubsetBundlePlugin,
    SubsetBundlePluginConfig,
    SubsetUtils,
} from './subset/SubsetBundlePlugin.js';

export interface Options extends Partial<SubsetBundlePluginConfig> {
    // define your plugin options here
}

class UnionFontPlugin {
    config: SubsetBundlePluginConfig = {};
    pluginStore = new Map<string, SubsetBundlePlugin>();
    prepared = false;
    async start() {
        if (this.prepared) return this.prepared
        if (!this.config.cacheDir)
            this.config.cacheDir = 'node_modules/.cache/.font';
        let resolve
        this.prepared = new Promise<void>((res)=>{
            resolve = res
        })
        await SubsetUtils.emptyCacheDir(this.config);
        console.log(
            'vite-plugin-font | empty cache dir | ' + this.config.cacheDir,
        );
        const plugin = new SubsetBundlePlugin(this.config);
        await plugin.createSubsets();
        this.pluginStore.set('default', plugin);
        console.log('vite-plugin-font | cache dir | ' + this.config.cacheDir);
        resolve()
    }
    createConfig(config: Options) {
        const scanFiles =
            typeof config.scanFiles === 'object' &&
            !(config.scanFiles instanceof Array)
                ? config.scanFiles
                : {
                      default: config.scanFiles!,
                  };
        this.config = { ...config, scanFiles };
    }
    getCacheDir() {
        return this.config.cacheDir ?? 'node_modules/.cache/.font';
    }
    setCacheDir(cacheDir: string) {
        this.config.cacheDir = cacheDir;
    }
    async getUsingPlugin(key: string) {
        let usingPlugin = this.pluginStore.get(key);
        if (!usingPlugin) {
            usingPlugin = new SubsetBundlePlugin(this.config);
            usingPlugin.key = key;
            await usingPlugin.createSubsets();
            this.pluginStore.set(key, usingPlugin);
        }
        return usingPlugin;
    }
}

export const unpluginFactory: UnpluginFactory<Options | undefined> = (
    config = {},
) => {
    const plugin = new UnionFontPlugin();
    plugin.createConfig(config);
    return {
        name: 'vite-plugin-font',
        loadInclude(id) {
            return [/\.otf/, /\.ttf/].some((i) => i.test(id));
        },
        enforce: 'pre',
        vite: {
            async configResolved(c) {
                plugin.setCacheDir(c.cacheDir);
                await plugin.start();
            },
        },
        async load(id) {
            await plugin.start();
            const { isSubset, searchParams } = SubsetUtils.isSubsetLink(id);
            const key = searchParams.get('key') ?? 'default';
            const usingPlugin = await plugin.getUsingPlugin(key);
            await usingPlugin.createBundle(id, isSubset ? 'subsets' : 'full');
            return usingPlugin.createSourceCode(id);
        },
    };
};

export const unplugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default unplugin;
