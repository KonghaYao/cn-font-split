import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
export default defineConfig(({ mode }) => {
    return {
        base: '',
        mode: 'production',
        define: {},
        plugins: [
            nodeExternals({
                exclude: ['google-protobuf'],
            }),
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: ['./src/index.ts'],
                formats: ['es'],
            },
            minify: true, // 禁用代码混淆
            sourcemap: true,
            assetsDir: '',
            assetsInlineLimit: 0,
            rollupOptions: {
                output: {
                    assetFileNames: `[name]-[hash].[ext]`,
                    exports: 'named',
                },
            },
        },
    };
});
