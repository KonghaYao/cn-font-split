import { fontSplit } from "@konghayao/cn-font-split";

await fontSplit({
    destFold: './temp/SourceHanSerifSC-VF/',
    FontPath: './temp/font/SourceHanSerifSC-VF.otf',
    reporter: false,
    testHTML: false,
    css: {
        localFamily: false,
        fontFamily: "SourceHanSerifSC-VF-demo",
        comment: {
            base: false,
            nameTable: false,
            unicodes: true
        },
        fontWeight: false
    },
    autoChunk: false,
    targetType: 'woff2',
    subsets: ['测试代码, 这是一段关于 Variable Font 的测试文本'.split('').map(i => i.charCodeAt(0))]
});