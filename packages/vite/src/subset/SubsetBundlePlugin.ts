import { BundlePlugin, BundlePluginConfig } from '../index.js';
import { glob } from 'glob';
import fs from 'fs';
import crypto from 'node:crypto';
export interface SubsetBundlePluginConfig extends BundlePluginConfig {
    scanFiles: string | string[];
    ignore?: string | string[];
    whiteList?: string | string[];
}
export class SubsetBundlePlugin extends BundlePlugin {
    subsetConfig: SubsetBundlePluginConfig;
    constructor(config: SubsetBundlePluginConfig) {
        super(config);
        this.subsetConfig = config;
    }

    usedSubsets = new Set<number>();
    async createSubsets() {
        this.getWhiteListSubsets();
        await this.getScanFiles();
        const subsetsArr = [...this.usedSubsets].sort((a, b) => a - b);
        this.subsets = [subsetsArr];
        return crypto
            .createHash('md5')
            .update(String.fromCharCode(...subsetsArr))
            .digest('hex');
    }
    async getScanFiles() {
        const files = await glob(this.subsetConfig.scanFiles, {
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
    getWhiteListSubsets() {
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
