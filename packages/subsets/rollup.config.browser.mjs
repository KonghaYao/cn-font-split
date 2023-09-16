import analyze from 'rollup-plugin-analyzer';
import commonPlugin from '@rollup/plugin-commonjs';
import fse from 'fs-extra';
import resolve from '@rollup/plugin-node-resolve';
import { createRequire } from 'node:module';
import path from 'node:path';
import alias from '@rollup/plugin-alias';
import condition from '@forsee/rollup-plugin-conditional';
const nodeAssets = await fse.readJson('./src/adapter/nodeAssets.json');

const require = createRequire(import.meta.url);

// 防止打包时删除 ts 的类型注解
fse.emptyDirSync('./dist/browser/');

// 传递一次静态文件
await Promise.all(
    [
        ...Object.values(nodeAssets)
            .filter((val) => {
                return !['.', '/'].includes(val[0]);
            })
            .map((v) => {
                let src;
                if (v[0] === '&') {
                    src = path.resolve('./dist', v.slice(1));
                } else {
                    src = require.resolve(v);
                }
                // console.log(src);
                return src;
            }),

        ...[
            '@chinese-fonts/wawoff2/build/compress_binding.wasm',
            '@chinese-fonts/wawoff2/build/decompress_binding.wasm',
        ].map((i) => require.resolve(i)),
    ].map((i) => {
        return fse.copy(i, './dist/browser/' + path.basename(i));
    })
);
import { createTypeForBrowser } from './scripts/createTypeForBrowser.mjs';
import commonConfig from './scripts/common.config.mjs';

createTypeForBrowser();
export default {
    input: './src/index.ts',
    output: {
        dir: './dist/browser',
        format: 'es',
        globals: {
            process: 'globalThis.process',
        },
        // sourcemap: true,
    },

    plugins: [
        condition({ env: 'browser' }),
        alias({
            entries: [{ find: 'path', replacement: 'path-browserify' }],
        }),
        ...commonPlugin,
        common(),
        resolve({
            browser: true,
            extensions: ['.ts', '.html', '.js', '.mjs'],
            // moduleDirectories: [],
            alias: {
                path: 'path-browserify',
            },
            preferBuiltins: true,
        }),

        analyze({
            summaryOnly: true,
            writeTo: (str) =>
                fse.outputFileSync('dist/browser/index.analyze.txt', str),
        }),
    ],
};
