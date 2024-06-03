import { defineConfig } from 'vite';
import Plugin, { fontSubsets } from './src/vite';
export default defineConfig({
    plugins: [Plugin({}), fontSubsets({
        scanFiles: ['src/**/*.{json,js,jsx,ts,tsx,vue}']
    })],
    build: {
        outDir: 'build',
    },
});
