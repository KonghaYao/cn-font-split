import type { UnpluginFactory } from 'unplugin';
import { createUnplugin } from 'unplugin';
import {
    SubsetBundlePlugin,
    SubsetBundlePluginConfig,
    SubsetUtils,
} from './subset/SubsetBundlePlugin.js';

export interface Options extends Partial<SubsetBundlePluginConfig> {
    /**
     * 默认为 [/\.otf/, /\.ttf/]
     */
    include?: RegExp[];
    /**
     * 默认为 [/\\\/node_modules\\//]
     */
    exclude?: RegExp[];
}

class UnionFontPlugin {
    config: SubsetBundlePluginConfig = {};
    pluginStore = new Map<string, SubsetBundlePlugin>();
    prepared?: Promise<null>;
    async start() {
        if (this.prepared) return this.prepared;
        if (!this.config.cacheDir)
            this.config.cacheDir = 'node_modules/.cache/.font';
        let resolve: (value: null) => void;
        this.prepared = new Promise<null>((res) => {
            resolve = res;
        });
        if (this.config.emptyCacheDir)
            await SubsetUtils.emptyCacheDir(this.config);
        console.log(
            'vite-plugin-font | empty cache dir | ' + this.config.cacheDir,
        );
        // 初始化 default
        await this.getUsingPlugin('default');
        console.log('vite-plugin-font | cache dir | ' + this.config.cacheDir);
        resolve!(null);
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
    const include = config.include ?? [/\.otf/, /\.ttf/];
    const exclude = config.exclude ?? [/\/node_modules\//];
    const plugin = new UnionFontPlugin();
    plugin.createConfig(config);
    return {
        name: 'vite-plugin-font',
        loadInclude(id) {
            if (exclude.some((i) => i.test(id))) return false;
            return include.some((i) => i.test(id));
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

export const fontPlugin = /* #__PURE__ */ createUnplugin(unpluginFactory);

export default fontPlugin;
