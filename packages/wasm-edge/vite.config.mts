import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
import dts from 'vite-plugin-dts';
export default defineConfig(({ mode }) => {
    return {
        base: '',
        mode: 'production',
        plugins: [
            // nodeExternals({
            //     builtinsPrefix: 'ignore',
            //     exclude: ['memfs-browser', '@tybys/wasm-util'],
            // }),
            dts({
                include: ['src/**/*', '../ffi/gen/index.ts'],
                exclude: ['src/*.test.ts'],
            }),
            {
                transform(code, id) {
                    if (id.includes('memfs')) {
                        return 'import {Buffer} from "buffer";\n' + code;
                    }
                    return code.replaceAll('process.env', 'import.meta.env');
                },
            },
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
