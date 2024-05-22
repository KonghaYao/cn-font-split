import { defineConfig } from 'vite';
import Plugin from './src/index';
export default defineConfig({
    plugins: [Plugin()],
    build: {
        outDir: 'build',
    },
});
