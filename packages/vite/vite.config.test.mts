import { defineConfig } from 'vite';
import Plugin from './src/unplugin';
export default defineConfig({
    plugins: [
        Plugin.vite({
            scanFiles: {
                default: ['./example/subsets.html'],
                'page-1': ['./example/subsets-1.html'],
            },
            exclude: [/node_modules/, ],
        }),
    ],
    build: {
        rollupOptions: {
            input: {
                index: './example/index.html',
                fallback: './example/fallback.html',
                subsets: './example/subsets.html',
                subsets1: './example/subsets-1.html',
            },
        },
        outDir: 'build',
    },
});
