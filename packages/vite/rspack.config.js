
module.exports = {
    module: {
        rules: [
            {
                test: /\.(otf|ttf)/i,
                use: [
                    {
                        loader: './src/webpack.mts',
                        options: {
                            scanFiles: {
                                'default': ['src/**/*.{json,js,jsx,ts,tsx,vue}'],
                                'page-1': ['example/**/*.{json,js,jsx,ts,tsx,vue}']
                            },
                        },
                    },
                ],
            },
        ],
    },
};