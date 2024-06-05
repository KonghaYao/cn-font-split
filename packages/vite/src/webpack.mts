import { SubsetBundlePlugin, SubsetUtils } from "./subset/SubsetBundlePlugin.js";
export default async function () {
    const config = this.getOptions();
    const cacheDir = "node_modules/.cache/.font";
    config.cacheDir = config.cacheDir || cacheDir;
    const id = this.resourcePath + this.resourceQuery;



    const { isSubset, searchParams } = SubsetUtils.isSubsetLink(id)
    const key = searchParams.get('key') ?? 'default'
    let plugin = new SubsetBundlePlugin(config)
    plugin.key = key
    await plugin.createSubsets();
    await plugin.createBundle(id, isSubset ? "subsets" : "full");
    return plugin.createSourceCode(id);
}
