import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
import dts from 'vite-plugin-dts';
export default defineConfig(({ mode }) => {
    return {
        base: '',
        mode: 'production',
        define: {},
        plugins: [
            nodeExternals({}),
            dts({
                include: ['src/**/*', '../ffi/gen/index.ts'],
                exclude: ['src/*.test.ts'],
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
