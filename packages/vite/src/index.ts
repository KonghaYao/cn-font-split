import { InputTemplate, fontSplit } from '@konghayao/cn-font-split';
import path from 'path';
import fs from 'fs';
import url from 'url';
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
    constructor(public config: BundlePluginConfig) {}

    getResolvedPath(p: string) {
        return path.resolve(this.config.cacheDir, getFileName(p));
    }
    async createSourceCode(p: string) {
        const resolvedPath = this.getResolvedPath(p);
        const json = await fs.promises.readFile(
            resolvedPath + '/reporter.json',
            'utf-8',
        );
        const obj = JSON.parse(json);
        const code = Object.entries(obj)
            .map(([k, v]) => {
                return `export const ${k} = ${JSON.stringify(v)};`;
            })
            .join('\n');
        const resultCSS = url.pathToFileURL(resolvedPath).pathname;
        return (
            `import '${resultCSS}/result.css?t=${(
                Math.random() * 100000
            ).toFixed(0)}';\n` + code
        );
    }
    async createBundle(p: string, mode: 'full' | 'subsets' = 'full') {
        const resolvedPath = this.getResolvedPath(p);
        let stat: boolean;
        try {
            await fs.promises.access(resolvedPath);
            stat = true;
        } catch (e) {
            stat = false;
        }
        if (!stat && this.config.server !== false) {
            console.log(
                'vite-plugin-font | font pre-building |' + resolvedPath,
            );
            await fontSplit({
                ...this.config,
                FontPath: p.split('?')[0],
                destFold: resolvedPath,
                reporter: true,
                autoChunk: mode === 'full',
                subsets:
                    mode !== 'full' ? chunk(this.subsets?.flat()) : undefined,
                log() {},
                logger: {
                    settings: {
                        minLevel: 5,
                    },
                },
            }).catch((e) => {
                console.error(e);
            });
        } else {
            console.log('vite-plugin-font | using cache | ' + resolvedPath);
        }
    }
}
