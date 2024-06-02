import { defineConfig } from 'vite';
import Plugin from './src/vite';
export default defineConfig({
    plugins: [Plugin({})],
    build: {
        outDir: 'build',
    },
});
