import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
import dts from 'vite-plugin-dts';
export default defineConfig(({ mode }) => {
    return {
        base: '',
        plugins: [
            mode === 'production' &&
                nodeExternals({
                    builtinsPrefix: 'ignore',
                    include: ['bun:ffi'],
                    exclude: ['memfs-browser', '@tybys/wasm-util'],
                }),
            dts({
                include: ['src/**/*', '../ffi/gen/index.ts'],
                exclude: ['src/*.test.ts'],
            }),
            {
                name: 'add deps',
                transform(code, id) {
                    if (mode === 'production' && id.includes('memfs')) {
                        return 'import { Buffer } from "buffer";\n' + code;
                    }
                    if (id.includes('wasm-util.esm')) {
                        return code.replaceAll(
                            'process.env',
                            'import.meta.env',
                        );
                    }
                },
            },
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: [
                    './src/node/index.ts',
                    './src/node/init.ts',
                    './src/bun/index.ts',
                    './src/bun/init.ts',
                    './src/deno/index.ts',
                    './src/wasm/index.ts',
                    './src/cli.ts',
                ],
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
                    preserveModules: true,
                    preserveModulesRoot: './src',
                },
            },
        },
    };
});
