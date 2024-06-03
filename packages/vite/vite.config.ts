import { defineConfig } from 'vite';
import Plugin from './src/vite';
export default defineConfig({
    plugins: [
        Plugin({
            scanFiles: ['test/**/*.{json,js,jsx,ts,tsx,vue}']
        })
    ],
    build: {
        outDir: 'build',
    },
});
