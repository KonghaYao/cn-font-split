import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
import dts from 'vite-plugin-dts';
import fs from 'fs-extra';
import { viteStaticCopy } from 'vite-plugin-static-copy';

try {
    fs.unlinkSync('./src/version');
} catch (e) {}

export default defineConfig(({ mode }) => {
    return {
        base: '',
        plugins: [
            mode === 'production' &&
                nodeExternals({
                    builtinsPrefix: 'ignore',
                    include: ['bun:ffi'],
                    exclude: [
                        'memfs-browser',
                        '@xan105/ffi/koffi',
                        '@tybys/wasm-util',
                    ],
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
            viteStaticCopy({
                targets: [
                    {
                        src: '../ffi/scripts/init.ps1',
                        dest: '',
                    },
                    {
                        src: '../ffi/scripts/init.sh',
                        dest: '',
                    },
                ],
            }),
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: [
                    './src/node/index.ts',
                    './src/bun/index.ts',
                    './src/deno/index.ts',
                    './src/cli.ts',
                    './src/auto.ts',
                ],
                formats: ['es', 'cjs'],
            },
            minify: true, // 禁用代码混淆
            sourcemap: true,
            assetsDir: '',
            assetsInlineLimit: 0,
            rollupOptions: {
                platform: 'node',
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
