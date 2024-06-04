import { BundlePlugin, BundlePluginConfig, getFileName } from '../index.js';
import { glob } from 'glob';
import fs from 'fs-extra';
import crypto from 'node:crypto';
import path from 'path'

export interface SubsetBundlePluginConfig extends BundlePluginConfig {
    scanFiles?: string | string[];
    ignore?: string | string[];
    whiteList?: string | string[];
}



export class SubsetBundlePlugin extends BundlePlugin {
    subsetConfig: SubsetBundlePluginConfig;
    constructor(config: SubsetBundlePluginConfig) {
        super(config);
        this.subsetConfig = config;
        this.subsetCacheDir = config.cacheDir
    }

    usedSubsets = new Set<number>();
    subsetCacheDir: string
    getResolvedPath(p: string) {
        const { isSubset, idString } = this.isSubsetLink(p)
        return path.resolve(isSubset ? this.subsetCacheDir : this.config.cacheDir, getFileName(idString));
    }
    isSubsetLink(p: string) {
        const [idString, params] = p.split('?');
        const searchParams = new URLSearchParams(params)
        const isSubset = searchParams.has('subsets')
        return { idString, isSubset, searchParams }
    }
    emptySubsetsDir() {
        const dir = path.resolve(
            this.config.cacheDir,
            '.subsets',
        )
        return fs.emptyDir(dir)
    }
    async createSubsets(p: string) {
        const { isSubset } = this.isSubsetLink(p)
        if (!isSubset) return;
        console.log("vite-plugin-font | Minimal Mode")
        this.getWhiteListSubsets();
        await this.getScanFiles();
        const subsetsArr = [...this.usedSubsets].sort((a, b) => a - b);
        this.subsets = [subsetsArr];
        const hash = crypto
            .createHash('md5')
            .update(String.fromCharCode(...subsetsArr))
            .digest('hex');
        // 修改缓存地址，达到缓存
        this.subsetCacheDir = path.resolve(
            this.config.cacheDir,
            '.subsets',
            hash,
        );
        return hash
    }
    private async getScanFiles() {
        const files = await glob(this.subsetConfig.scanFiles!, {
            absolute: true,
            nodir: true,
            ignore: this.subsetConfig.ignore ?? ['node_modules/**'],
        });
        return Promise.all(
            files.map((i) => {
                return new Promise((res, rej) => {
                    const stream = fs.createReadStream(i, {
                        encoding: 'utf8',
                    });
                    stream.on('data', (i: string) => {
                        i.split('').forEach((char) =>
                            this.usedSubsets.add(char.charCodeAt(0)),
                        );
                    });
                    stream.on('end', () => {
                        res(null);
                    });
                    stream.on('error', (err) => {
                        rej(err);
                    });
                });
            }),
        );
    }
    private getWhiteListSubsets() {
        let whiteList = this.subsetConfig.whiteList ?? [];
        if (!(whiteList instanceof Array)) {
            whiteList = [whiteList];
        }
        const set = this.usedSubsets;
        whiteList.forEach((str) =>
            str.split('').forEach((char) => set.add(char.charCodeAt(0))),
        );
    }
}
