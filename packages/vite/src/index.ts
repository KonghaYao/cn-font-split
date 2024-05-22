import { InputTemplate, fontSplit } from '@konghayao/cn-font-split';
import type { Plugin } from 'vite';
import path from 'path';
import fs from 'fs';

function getFileName(id: string) {
    return path.basename(id).replace(/\./g, '_');
}

export default function split(
    config: Partial<
        InputTemplate & {
            cacheDir?: string;
        }
    > = {},
): Plugin {
    let viteConfig;
    let cacheDir = config.cacheDir;
    return <Plugin>{
        name: 'vite-plugin-font',
        enforce: 'pre',
        configResolved(c) {
            viteConfig = c;
            cacheDir = cacheDir ?? path.resolve(c.cacheDir, './.font/');
            console.log('cn-font-split | 字体构建缓存地址 | ' + cacheDir);
        },
        async load(id, options) {
            if (['.otf', '.ttf'].some((i) => id.endsWith(i))) {
                const resolvedPath = path.resolve(cacheDir!, getFileName(id));
                let stat;
                try {
                    stat = fs.statSync(resolvedPath);
                } catch (e) {}
                if (!stat) {
                    console.log('cn-font-split | 字体预构建中');
                    await fontSplit({
                        ...config,
                        FontPath: id,
                        destFold: resolvedPath,
                        reporter: true,
                        log(...args) {},
                    });
                } else {
                    console.log('cn-font-split | 采用缓存 | ' + resolvedPath);
                }
                const json = fs.readFileSync(
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
        },
    };
}
