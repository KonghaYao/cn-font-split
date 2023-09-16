import fse from 'fs-extra';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';
import OMT from '@surma/rollup-plugin-off-main-thread';
import replace from '@rollup/plugin-replace';
import packages from '../package.json';
export default [
    OMT(),
    json({
        namedExports: false,
    }),
    {
        name: 'html',
        load: {
            order: 'pre',

            handler(id) {
                if (id.endsWith('.html')) {
                    const code = fse.readFileSync(id);
                    return {
                        code: `export default ${JSON.stringify(
                            code.toString('utf-8')
                        )}`,
                    };
                }
            },
        },
    },
    babel({
        extensions: ['.ts'],
        babelHelpers: 'bundled',
    }),
    replace({
        __cn_font_split_version__: () => JSON.stringify(packages.version),
    }),
];
