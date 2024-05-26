import { BundlePlugin } from './index.js';

export default async function (this: any) {
    const config = this.getOptions();
    const cacheDir = 'node_modules/.cache/.font';

    config.cacheDir = config.cacheDir || cacheDir;
    const id = this.resourcePath;
    const plugin = new BundlePlugin(config);
    await plugin.createBundle(id);
    return plugin.createSourceCode(id);
}
