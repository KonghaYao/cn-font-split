import { InputTemplate, Subsets, fontSplit } from '@konghayao/cn-font-split';
import path from 'path';
import fs from 'fs';

function getFileName(id: string) {
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

export type BundlePluginConfig = Partial<
    InputTemplate & {
        cacheDir?: string;
        server?: boolean;
    }
>;

export class BundlePlugin {
    constructor(
        public config: BundlePluginConfig = {},
        public subsets: number[][] | undefined = undefined,
    ) {}

    getResolvedPath(p: string) {
        return path.resolve(this.config.cacheDir!, getFileName(p));
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
                return `export const ${k} = /*@__PURE__*/ JSON.parse('${JSON.stringify(
                    v,
                )}');`;
            })
            .join('\n');
        return `import '${resolvedPath}/result.css';` + code;
    }
    async createBundle(p: string) {
        const resolvedPath = this.getResolvedPath(p);
        let stat: boolean;
        try {
            await fs.promises.access(resolvedPath);
            stat = true;
        } catch (e) {
            stat = false;
        }
        if (!stat && this.config.server !== false) {
            console.log('vite-plugin-font | font pre-building');
            await fontSplit({
                ...this.config,
                FontPath: p,
                destFold: resolvedPath,
                reporter: true,
                autoChunk: !this.subsets,
                subsets: chunk(this.subsets?.flat()),
                log() {},
            }).catch((e) => {
                console.error(e);
            });
        } else {
            console.log('vite-plugin-font | using cache | ' + resolvedPath);
        }
    }
}
