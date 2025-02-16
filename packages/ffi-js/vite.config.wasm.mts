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
            nodeExternals({
                builtinsPrefix: 'ignore',
                include: ['bun:ffi'],
                exclude: [
                    'memfs-browser',
                    '@xan105/ffi/koffi',
                    '@tybys/wasm-util',
                ],
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
            emptyOutDir: false,
            target: 'esnext',
            outDir: 'dist/wasm',
            lib: {
                entry: ['./src/wasm/index.ts'],
                formats: ['es'],
            },
            minify: false, // 禁用代码混淆
            sourcemap: false,
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
