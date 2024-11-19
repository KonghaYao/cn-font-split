import { createLogger, defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
        base: '',
        mode: 'production',
        plugins: [
            {
                enforce: 'pre',
                resolveId(id, importer, options) {
                    if (
                        id.startsWith('.') ||
                        id.startsWith('/') ||
                        id.startsWith('https') ||
                        id.startsWith('node:')
                    )
                        return;
                    console.log(id);
                    return {
                        id: 'https://esm.sh/' + id,
                        external: true,
                    };
                },
            },
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: './server/index.ts',
                formats: ['es'],
                name: 'edge-provider',
            },
            sourcemap: true,
            minify: true,
            rollupOptions: {
                output: {
                    assetFileNames: `[name]-[hash].[ext]`,
                },
            },
        },
    };
});
