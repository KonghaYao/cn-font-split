import { defineConfig } from 'vite';
import Plugin from './src/vite';
export default defineConfig({
    plugins: [
        Plugin({
            scanFiles: {
                default: ['subsets.html'],
                'page-1': ['subsets-1.html'],
            },
        }),
    ],
    build: {
        rollupOptions: {
            input: {
                index: 'index.html',
                fallback: 'fallback.html',
                subsets: 'subsets.html',
                subsets1: 'subsets-1.html',
            },
        },
        outDir: 'build',
    },
});
