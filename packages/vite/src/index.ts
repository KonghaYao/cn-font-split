import { InputTemplate, fontSplit } from 'cn-font-split';
import path from 'path';
import fs from 'fs';
import url from 'url';
import crypto from 'crypto'
import { createChineseCrossPlatformFallbackCss } from './createChineseCrossPlatformFallbackCss'
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

export type BundlePluginConfig = Partial<InputTemplate> & {
    cacheDir: string;
    server?: boolean;
};

export class BundlePlugin {
    public subsets: number[][] | undefined = undefined;
    constructor(public config: BundlePluginConfig, public key = 'default') { }

    getResolvedPath(p: string) {
        return path.resolve(this.config.cacheDir, getFileName(p));
    }
    async createSourceCode(p: string) {
        const resolvedPath = this.getResolvedPath(p);
        const json = await fs.promises.readFile(
            resolvedPath + '/reporter.json',
            'utf-8',
        );
        const json1 = await fs.promises.readFile(
            resolvedPath + '/metrics.json',
            'utf-8',
        );
        const obj = { ...JSON.parse(json), ...JSON.parse(json1) };
        const code = Object.entries(obj)
            .map(([k, v]) => {
                return `export const ${k} = ${JSON.stringify(v)};`;
            })
            .join('\n');
        const resultCSS = url.pathToFileURL(resolvedPath).pathname;
        const key = (
            Math.random() * 100000
        ).toFixed(0)
        return (
            `import '${resultCSS}/metrics.css?t=${key}';\n` +
            `import '${resultCSS}/result.css?t=${key}';\n` + code
        );
    }
    async checkCache(resolvedPath: string) {
        let stat: boolean;
        try {
            await fs.promises.access(resolvedPath);
            await fs.promises.access(path.resolve(resolvedPath, 'result.css'));
            await fs.promises.access(path.resolve(resolvedPath, 'metrics.css'));
            await fs.promises.access(path.resolve(resolvedPath, 'metrics.json'));
            await fs.promises.access(path.resolve(resolvedPath, 'reporter.json'));
            stat = true;
        } catch (e) {
            stat = false;
        }
        return stat
    }
    async createBundle(p: string, mode: 'full' | 'subsets' = 'full') {
        const resolvedPath = this.getResolvedPath(p);
        const stat = await this.checkCache(p)
        if (!stat && this.config.server !== false) {
            console.log(
                'vite-plugin-font | font pre-building |' + resolvedPath,
            );
            const FontPath = p.split('?')[0]
            await fontSplit({
                ...this.config,
                FontPath,
                destFold: resolvedPath,
                reporter: true,
                autoChunk: mode === 'full',
                subsets:
                    mode !== 'full' ? chunk(this.subsets?.flat()) : undefined,
                log() { },
                logger: {
                    settings: {
                        minLevel: 5,
                    },
                },
            }).catch((e) => {
                console.error(e);
            });
            await this.createFallback(FontPath, resolvedPath)
        } else {
            console.log('vite-plugin-font | using cache | ' + resolvedPath);
        }
    }
    async createFallback(FontPath: string, resolvedPath: string) {
        const hash = crypto
            .createHash('md5')
            .update(FontPath)
            .digest('hex');
        const { fontFamilyString, css } = await createChineseCrossPlatformFallbackCss(FontPath, ` ${this.key} ${hash.slice(0,6)}`)
        await fs.promises.writeFile(path.resolve(resolvedPath, 'metrics.css'), css)
        await fs.promises.writeFile(path.resolve(resolvedPath, 'metrics.json'), JSON.stringify({ fontFamilyFallback: fontFamilyString }))
    }
}
