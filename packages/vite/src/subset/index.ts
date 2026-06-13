import { proto, fontSplit, decodeReporter } from 'cn-font-split';
import path from 'path';
import fs from 'fs-extra';
import url from 'url';
import crypto from 'crypto';
import { createChineseCrossPlatformFallbackCss } from 'cn-font-metrics';
export function getFileName(id: string) {
    return path.basename(id).replace(/\./g, '_');
}
function chunk(arr?: number[], size = 500) {
    if (arr) {
        let result = [];
        for (let i = 0; i < arr.length; i += size) {
            result.push(arr.slice(i, i + size));
        }

        return result;
    } else {
        return;
    }
}

export type BundlePluginConfig = Omit<Partial<proto.InputTemplate>, 'input' | 'subsets'> & {
    cacheDir?: string;
    server?: boolean;
    subsetChunkSize?: number
};

export class BundlePlugin {
    public subsets: number[][] | undefined = undefined;
    constructor(
        public config: BundlePluginConfig,
        public key = 'default',
    ) {}

    /** 获取正确的缓存文件夹的位置 */
    getCachedPath(p: string) {
        return path.resolve(this.config.cacheDir!, getFileName(p));
    }
    /** 创建 CSS 封装层源代码 */
    async createSourceCode(p: string) {
        const resolvedPath = this.getCachedPath(p);
        const reporter = decodeReporter(
            await fs.promises.readFile(resolvedPath + '/reporter.bin'),
        );

        const metrics = await fs.readJSON(resolvedPath + '/metrics.json');
        const details = { ...reporter.toObject(), ...metrics };
        const code = Object.entries(details)
            .map(([k, v]) => {
                return `export const ${k} = ${JSON.stringify(v)};`;
            })
            .join('\n');
        const resultCSS = decodeURI(url.pathToFileURL(resolvedPath).pathname);
        const key = (Math.random() * 100000).toFixed(0);
        return (
            `import '${resultCSS}/metrics.css?t=${key}';\n` +
            `import '${resultCSS}/result.css?t=${key}';\n` +
            code
        );
    }
    /** 检查整个系统的缓存 */
    async checkCache(resolvedPath: string) {
        const isFullCached = await Promise.all([
            fs.exists(resolvedPath),
            fs.exists(path.resolve(resolvedPath, 'result.css')),
            fs.exists(path.resolve(resolvedPath, 'metrics.css')),
            fs.exists(path.resolve(resolvedPath, 'metrics.json')),
            fs.exists(path.resolve(resolvedPath, 'reporter.bin')),
        ]);
        return isFullCached.every((i) => i);
    }
    /** 重新进行预构建字体 */
    async prebuild(filePath: string, mode: 'full' | 'subsets' = 'full') {
        const resolvedPath = this.getCachedPath(filePath);
        const isCached = await this.checkCache(resolvedPath);
        if (!isCached && this.config.server !== false) {
            console.log(
                'vite-plugin-font | font pre-building | ' + resolvedPath,
            );
            const FontPath = filePath.split('?')[0];
            const onlySubset = mode !== 'full';
            await fontSplit({
                input: FontPath,
                outDir: resolvedPath,
                reporter: true,
                languageAreas: !onlySubset as false,
                autoSubset: true,
                fontFeature: true,
                reduceMins: !onlySubset,
                subsetRemainChars: !onlySubset,
                subsets: onlySubset ? chunk(this.subsets?.flat(), this.config.subsetChunkSize) : undefined,
                silent: true,
                ...this.config,
            }).catch((e) => {
                console.error(e);
            });
            await this.createCSSFontFallback(FontPath, resolvedPath);
        } else {
            console.log('vite-plugin-font | using cache | ' + resolvedPath);
        }
    }
    /** 写入 CSS 字体的 fallback 选项，减少布局抖动  */
    async createCSSFontFallback(FontPath: string, resolvedPath: string) {
        const hash = crypto.createHash('md5').update(FontPath).digest('hex');
        const { fontFamilyString, css } =
            await createChineseCrossPlatformFallbackCss(
                FontPath,
                ` ${this.key} ${hash.slice(0, 6)}`,
            );
        await fs.promises.writeFile(
            path.resolve(resolvedPath, 'metrics.css'),
            css,
        );
        await fs.promises.writeFile(
            path.resolve(resolvedPath, 'metrics.json'),
            JSON.stringify({ fontFamilyFallback: fontFamilyString }),
        );
    }
}
