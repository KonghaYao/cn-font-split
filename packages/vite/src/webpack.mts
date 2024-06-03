import { SubsetBundlePlugin } from "./subset/SubsetBundlePlugin.js";
export default async function () {
    const config = this.getOptions();
    const cacheDir = "node_modules/.cache/.font";
    config.cacheDir = config.cacheDir || cacheDir;
    const id = this.resourcePath + this.resourceQuery;
    const plugin = new SubsetBundlePlugin(config);
    const isSubset = plugin.isSubsetLink(id);
    await plugin.createSubsets(id);
    await plugin.createBundle(id, isSubset ? "subsets" : "full");
    return plugin.createSourceCode(id);
}
