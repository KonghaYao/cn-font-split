import { fontSplit } from "../dist/cn-font-split.js";

fontSplit({
    destFold: './temp/overwrite',
    FontPath: '../demo/public/SmileySans-Oblique.ttf',
    targetType: 'woff2',
    previewImage: {},
    testHTML: true,
    reporter: true,
    plugins: {
        async PreSubset(ctx) {
            // 所有需要的工具函数请 pick 出来
            const { input, hb, face, ttfBufferSize, bundleMessage, fontTool } =
                ctx.pick(
                    'input',
                    'face',
                    'hb',
                    'ttfBufferSize',
                    'bundleMessage',
                    'fontTool',
                );
            // 获取字体包中所有 unicode 码的方式
            const totalChars = face.collectUnicodes();
            ctx.log("进入自定义 PreSubset 模式 ")
            // 最终，所有的数据都是写入到 number[][], 字符用 unicode 序号表示
            const totalSubsets = [
                // 分包 subset 1 
                [...Array(0x39 - 0x30 + 1).keys()].map(i => {
                    return 0x30 + i
                }),
                // 分包 subset 2 
                [0x4e00, 0x4e01],
            ]
            ctx.set('subsetsToRun', totalSubsets);
            ctx.free('ttfFile');
        }
    }
})