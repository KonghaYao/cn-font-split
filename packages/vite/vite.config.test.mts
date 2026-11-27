import { defineConfig } from 'vite';
import Plugin from './src/unplugin';
export default defineConfig({
    plugins: [
        Plugin.vite({
            scanFiles: {
                default: ['./example/subsets.html'],
                'page-1': ['./example/subsets-1.html'],
            },
            exclude: [/node_modules/],
            // issue #217 的缓存键回归测试需要在不改源码的前提下切换配置，
            // 例如 FONT_DISPLAY=optional pnpm vite build -c vite.config.test.mts
            ...(process.env.FONT_DISPLAY
                ? { css: { fontDisplay: process.env.FONT_DISPLAY } }
                : {}),
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
