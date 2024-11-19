import { defineConfig } from 'vite';
import nodeExternals from 'rollup-plugin-node-externals';
export default defineConfig(({ mode }) => {
    return {
        base: '',
        mode: 'production',
        define: {
        
        },
        plugins: [
            nodeExternals({
                exclude: [
                  
                ],
            }),
           
        ],
        build: {
            target: 'esnext',
            lib: {
                entry: './src/index.ts',
                formats: ['es','cjs'],
                name: 'cn-font-metric',
            },
            minify: false, // 禁用代码混淆
            assetsDir: '',
            assetsInlineLimit: 0,
            rollupOptions: {
                output: {
                    assetFileNames: `[name]-[hash].[ext]`,
                },
            },
        },

    };
});
