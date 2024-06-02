import fse from 'fs-extra';
import resolve from '@rollup/plugin-node-resolve';
import condition from '@forsee/rollup-plugin-conditional';
import commonPlugin from './scripts/common.config.mjs';
// 防止打包时删除 ts 的类型注解
fse.emptyDirSync('./dist/');

export default {
    external: [],
    input: './src/index.ts',
    output: {
        dir: './dist/',
        format: 'es',
        paths: {},
        sourcemap: true,
    },
    plugins: [
        condition({ env: 'node' }),
        ...commonPlugin,

        resolve({
            extensions: ['.ts', '.html'],
            moduleDirectories: [],
        }),
    ],
};
