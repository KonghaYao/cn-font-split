import { BundlePlugin, BundlePluginConfig, getFileName } from './index.js';
import { glob } from 'glob';
import fs from 'fs-extra';
import crypto from 'node:crypto';
import path from 'path';
import { minimatch } from 'minimatch';
export interface SubsetBundlePluginConfig extends BundlePluginConfig {
    scanFiles?: string | string[] | Record<string, string | string[]>;
    ignore?: string | string[];
    whiteList?: string | string[];
    emptyCacheDir?: boolean;
}

export class SubsetUtils {
    static isSubsetLink(p: string) {
        const [idString, params] = p.split('?');
        const searchParams = new URLSearchParams(params);
        const isSubset = searchParams.has('subsets');
        return { idString, isSubset, searchParams };
    }
    static emptyCacheDir(config: BundlePluginConfig) {
        if (!config.cacheDir)
            throw new Error('vite-plugin-font | cacheDir missed');
        const dir = path.resolve(config.cacheDir, '.subsets');
        return fs.emptyDir(dir);
    }
}

export class SubsetBundlePlugin extends BundlePlugin {
    /** 构建引擎的文件 ID，提供给构建引擎判断 */
    public buildId?: string;
    subsetConfig: SubsetBundlePluginConfig;
    constructor(config: SubsetBundlePluginConfig, key?: string) {
        super(config, key);
        this.subsetConfig = config;
        this.subsetCacheDir = config.cacheDir!;
    }

    usedSubsets = new Set<number>();
    subsetCacheDir: string;
    getCachedPath(p: string) {
        const { isSubset, idString } = this.isSubsetLink(p);
        return path.resolve(
            isSubset ? this.subsetCacheDir : this.config.cacheDir!,
            isSubset ? getFileName(idString) : this.getCacheDirName(idString),
        );
    }
    isSubsetLink = SubsetUtils.isSubsetLink;
    async createSubsetsHash() {
        if (!this.subsetConfig.scanFiles) return;
        // 每轮都用新的集合重新统计：watch 模式下同一个实例会被多次调用，
        // 复用旧集合会让已删除文件里的码点一直累积在码点哈希中。
        const usedSubsets = new Set<number>();
        this.getWhiteListSubsets(usedSubsets);
        await this.updateScanFiles(usedSubsets);
        this.usedSubsets = usedSubsets;
        const subsetsArr = [...usedSubsets].sort((a, b) => a - b);
        this.subsets = [subsetsArr];
        const hash = crypto
            .createHash('md5')
            .update(String.fromCodePoint(...subsetsArr))
            // 码点相同但配置不同（如 css.fontDisplay）时必须换缓存目录，
            // 否则会命中上一份配置生成的 result.css。
            .update('\u0000')
            .update(this.configHash)
            .digest('hex');
        // 修改缓存地址，达到缓存
        this.subsetCacheDir = path.resolve(
            this.config.cacheDir!,
            '.subsets',
            hash,
        );
        return hash;
    }
    /** 匹配绝对路径是否被获取到 */
    isMatchScanArea(p: string) {
        const globStr = this.getGlobArea();
        if (!globStr) return false;
        const resolvePath = (p: string) => path.resolve(process.cwd(), p);
        if (globStr instanceof Array) {
            return globStr.some((i) => minimatch(p, resolvePath(i)));
        }
        return minimatch(p, resolvePath(globStr));
    }
    /** 获取配置中的 scanFiles 字段 */
    private getGlobArea() {
        if (
            typeof this.subsetConfig.scanFiles === 'object' &&
            !(this.subsetConfig.scanFiles instanceof Array)
        ) {
            return this.subsetConfig.scanFiles[this.key];
        } else {
            return this.subsetConfig.scanFiles;
        }
    }
    private async updateScanFiles(usedSubsets: Set<number>) {
        const globStr = this.getGlobArea();
        if (!globStr) return;
        const files = await glob(globStr!, {
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
                    stream.on('data', (i) => {
                        [...(i as string)].forEach((char) =>
                            usedSubsets.add(char.codePointAt(0)!),
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
    private getWhiteListSubsets(set: Set<number>) {
        let whiteList = this.subsetConfig.whiteList ?? [];
        if (!(whiteList instanceof Array)) {
            whiteList = [whiteList];
        }
        whiteList.forEach((str) =>
            [...str].forEach((char) => set.add(char.codePointAt(0)!)),
        );
    }
}
