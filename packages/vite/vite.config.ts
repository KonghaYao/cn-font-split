import { defineConfig } from 'vite';
import Plugin from './src/vite';
export default defineConfig({
    plugins: [
        Plugin({
            scanFiles: {
                'default': ['src/**/*.{json,js,jsx,ts,tsx,vue}'],
                'page-1': ['example/**/*.{json,js,jsx,ts,tsx,vue}']
            },
        })
    ],
    build: {
        outDir: 'build',
    },
});
