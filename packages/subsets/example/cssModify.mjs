import fs from 'fs-extra';
import { fontSplit } from '../dist/cn-font-split.js';

fs.emptyDirSync('./temp/node');
fontSplit({
    destFold: './temp/node',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',
    targetType: 'woff2',
    previewImage: {},
    testHTML: true,
    reporter: true,
    css: {
        fontFamily: 'cn-font-gen-12', // 修改 css 中的 family 名称
        fontWeight: false, // 自动带出字重，可以填入字符串或者数字
        fontStyle: "normal",
        fontDisplay: "swap", // 定义浏览器加载行为
        localFamily: false, // 使用本地 css
        // 是否添加头部注释
        comment: {
            base: false, // 基础信息
            nameTable: false, // 字体内的各种解释文本
            unicodes: false, // 将 unicodes 注释在每一个分包，方便查看
        },
        compress: true // 是否压缩 css
    },
});
