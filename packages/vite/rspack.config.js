import unplugin from './dist/unplugin.js';
import rspack from '@rspack/core';
export default {
    entry: {
        index: './example/index.mjs',
        fallback: './example/fallback.mjs',
        subsets: './example/subsets.mjs',
        'subsets-1': './example/subsets-1.mjs',
    },
    output: {
        path: './build/rspack',
    },
    experiments: {
        css: true,
    },
    plugins: [
        new rspack.HtmlRspackPlugin({
            filename: 'index.html',
            template: './example/index.html',
            chunks: ['index'],
        }),
        new rspack.HtmlRspackPlugin({
            filename: 'fallback.html',
            template: './example/fallback.html',
            chunks: ['fallback'],
        }),
        new rspack.HtmlRspackPlugin({
            filename: 'subsets.html',
            template: './example/subsets.html',
            chunks: ['subsets'],
        }),
        new rspack.HtmlRspackPlugin({
            filename: 'subsets-1.html',
            template: './example/subsets-1.html',
            chunks: ['subsets-1'],
        }),
        unplugin.rspack({
            scanFiles: {
                default: ['./example/subsets.html'],
                'page-1': ['./example/subsets-1.html'],
            },
        }),
    ],
};
