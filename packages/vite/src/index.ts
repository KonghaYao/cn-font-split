import { InputTemplate, fontSplit } from '@konghayao/cn-font-split';
import path from 'path';
import fs from 'fs';

function getFileName(id: string) {
    return path.basename(id).replace(/\./g, '_');
}

export class BundlePlugin {
    constructor(
        public config: Partial<
            InputTemplate & {
                cacheDir?: string;
                server?: boolean;
            }
        > = {},
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
        let stat;
        try {
            stat = await fs.promises.stat(resolvedPath);
        } catch (e) {}
        if (!stat && this.config.server !== false) {
            console.log('cn-font-split | 字体预构建中');
            await fontSplit({
                ...this.config,
                FontPath: p,
                destFold: resolvedPath,
                reporter: true,
                log() {},
            }).catch((e) => {
                console.error(e);
            });
        } else {
            console.log('cn-font-split | 采用缓存 | ' + resolvedPath);
        }
    }
}
