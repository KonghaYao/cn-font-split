export default {
    entry: ['./index.html'],
    output: {
        path: './build/rspack',
    },
    module: {
        rules: [
            {
                test: /\.(otf|ttf)/i,
                use: [
                    {
                        loader: './dist/webpack.mjs',
                        options: {
                            scanFiles: {
                                default: ['src/**/*.{json,js,jsx,ts,tsx,vue}'],
                                'page-1': [
                                    'example/**/*.{json,js,jsx,ts,tsx,vue}',
                                ],
                            },
                        },
                    },
                ],
            },
        ],
    },
};
