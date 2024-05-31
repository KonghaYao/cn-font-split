import { defineConfig } from 'vite';
import Plugin from './dist/vite.js';
export default defineConfig({
    plugins: [Plugin()],
    build: {
        outDir: 'build',
    },
});
