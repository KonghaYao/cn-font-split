import fse from 'fs-extra';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import OMT from '@surma/rollup-plugin-off-main-thread';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
const packages = fse.readJSONSync('./package.json');
export default [
    OMT(),
    json({
        namedExports: false,
    }),
    babel({
        extensions: ['.ts'],
        babelHelpers: 'bundled',
    }),
    replace({
        __cn_font_split_version__: () => JSON.stringify(packages.version),
    }),
    // terser(),
];
