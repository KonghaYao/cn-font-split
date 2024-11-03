import { defineConfig } from 'vite';
import condition from '@forsee/rollup-plugin-conditional';
import p from './package.json';
import nodeExternals from 'rollup-plugin-node-externals';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { NodeNativePolyfill } from './scripts/NodeNativePolyfill.mts';

const nodeReplacer = {
    path: 'path-browserify',
};
export default defineConfig(({ mode }) => {
    const isBrowser = mode === 'browser';
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
            NodeNativePolyfill(nodeReplacer),
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
            assetsDir: '',
            assetsInlineLimit: 0,
            rollupOptions: {
                output: {
                    assetFileNames: `[name]-[hash].[ext]`,
                },
            },
        },

        worker: {
            format: 'es',
            plugins: () => [
                nodeExternals({
                    builtins: !isBrowser,
                    deps: !isBrowser,
                }),
                NodeNativePolyfill(nodeReplacer),
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
