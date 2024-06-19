import { defineConfig } from 'vite';
import Plugin from './src/vite';
export default defineConfig({
    plugins: [
        Plugin({
            scanFiles: {
                default: ['test/test.txt'],
                'page-1': ['test/test2.txt'],
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
