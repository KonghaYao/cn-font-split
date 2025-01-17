import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
import dts from 'vite-plugin-dts';
export default defineConfig(({ mode }) => {
    return {
        base: '',
        plugins: [
            nodeExternals({
                builtinsPrefix: 'ignore',
                include: [],
                exclude: [],
            }),
            dts({
                include: ['src/**/*', '../ffi/gen/index.ts'],
                exclude: ['src/*.test.ts'],
            }),
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: ['./src/unplugin.ts'],
                formats: ['es', 'cjs'],
            },
            minify: false, // 禁用代码混淆
            sourcemap: false,
            assetsDir: '',
            assetsInlineLimit: 0,
            rollupOptions: {
                output: {
                    assetFileNames: `[name]-[hash].[ext]`,
                    exports: 'named',
                    preserveModules: true,
                    preserveModulesRoot: './src',
                },
            },
        },
    };
});
