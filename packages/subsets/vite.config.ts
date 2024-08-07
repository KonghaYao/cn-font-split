import { defineConfig } from 'vite';
import condition from '@forsee/rollup-plugin-conditional';
import p from './package.json';
import nodeExternals from 'rollup-plugin-node-externals';
import replace from '@rollup/plugin-replace';
export default defineConfig(({ mode }) => {
    const isBrowser = mode === 'browser';
    const conditionPlugin = {
        enforce: 'pre',
        ...condition({ env: isBrowser ? 'browser' : 'node' }),
    };

    return {
        plugins: [
            nodeExternals({
                exclude: [
                    /@konghayao\/opentype.js/,
                    /@konghayao\/harfbuzzjs/,
                    /@chinese\-fonts\/wawoff2/,
                    /font\-sharp/,
                ],
            }),

            conditionPlugin,
            replace({
                __cn_font_split_version__: () => JSON.stringify(p.version),
            }),
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: './src/index.ts',
                formats: ['es', isBrowser ? 'es' : 'cjs'],
                name: 'cnFontSplit',
            },
            assetsInlineLimit: 0,
            // rollupOptions: {},
        },

        worker: {
            format: 'es',
            plugins: [nodeExternals({}), conditionPlugin],
        },

        resolve: {},
    };
});
