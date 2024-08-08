import { defineConfig } from 'vite';
import condition from '@forsee/rollup-plugin-conditional';
import p from './package.json';
import nodeExternals from 'rollup-plugin-node-externals';
import { viteStaticCopy } from 'vite-plugin-static-copy';
const isNodeModule = (key) => key.startsWith('node:');
const nodeReplacer = {
    path: 'path-browserify',
};
const loadNodeModule = (key) => {
    key = key.replace('node:', '');
    if (key in nodeReplacer) {
        return `
import A from "${nodeReplacer[key]}";
export default A;
export * from "${nodeReplacer[key]}"`;
    }
    return `export default '';
export const promisify = '';`;
};
export default defineConfig(({ mode }) => {
    const isBrowser = mode === 'browser';
    const isCJS = mode === 'cjs';
    const conditionPlugin = {
        enforce: 'pre',
        ...condition({ env: isBrowser ? 'browser' : 'node' }),
    };

    return {
        base: '',
        mode: 'production',
        define: {
            __cn_font_split_version__: JSON.stringify(p.version),
        },
        publicDir: 'data',
        plugins: [
            nodeExternals({
                exclude: [
                    /@konghayao\/opentype.js/,
                    /@konghayao\/harfbuzzjs/,
                    /@chinese\-fonts\/wawoff2/,
                    /font\-sharp/,
                ],
                builtins: !isBrowser,
                deps: !isBrowser,
            }),
            !isBrowser &&
                viteStaticCopy({
                    targets: [
                        {
                            src: './node_modules/@chinese-fonts/font-contours/data/unicodes_contours.dat',
                            dest: '',
                        },
                    ],
                }),
            conditionPlugin,
            {
                transform(code, id) {
                    // 修复 emscripten 导致脚本中的 promise 参数反转问题
                    if (id.includes('@konghayao/harfbuzz')) {
                        return code.replace('reject,resolve', 'resolve,reject');
                    }
                },
            },
            {
                load(id) {
                    if (isNodeModule(id)) {
                        return loadNodeModule(id);
                    }
                },
            },
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: './src/index.ts',
                formats: ['es', isBrowser ? 'es' : 'cjs'],
                name: 'cn-font-split',
                fileName: isBrowser && 'cn-font-split.browser',
            },
            minify: false, // 禁用代码混淆
            assetsInlineLimit: 0,
        },

        worker: {
            format: 'es',
            plugins: [
                nodeExternals({
                    builtins: !isBrowser,
                    deps: !isBrowser,
                }),
                {
                    load(id) {
                        if (isNodeModule(id)) {
                            return loadNodeModule(id);
                        }
                    },
                },
                conditionPlugin,
            ],
        },
        resolve: {
            alias: isBrowser && {
                path: 'path-browserify',
            },
        },
    };
});
