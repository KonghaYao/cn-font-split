import { fontSplit } from 'cn-font-split';

await fontSplit({
    outDir: './temp/SourceHanSerifSC-VF/',
    input: './temp/font/SourceHanSerifSC-VF.otf',
    reporter: false,
    testHTML: false,
    css: {
        localFamily: false,
        fontFamily: 'SourceHanSerifSC-VF-demo',
        comment: {
            base: false,
            nameTable: false,
            unicodes: true,
        },
        fontWeight: false,
    },
    autoChunk: false,
    targetType: 'woff2',
    subsets: [
        [...'测试代码, 这是一段关于 Variable Font 的测试文本'].map((i) =>
            i.codePointAt(0),
        ),
    ],
});
await fontSplit({
    outDir: './temp/NotoColorEmoji/',
    input: './temp/font/NotoColorEmoji.ttf',
    reporter: false,
    testHTML: false,
    css: {
        localFamily: false,
        fontFamily: 'NotoColorEmoji-demo',
        comment: {
            base: false,
            nameTable: false,
            unicodes: true,
        },
        fontWeight: false,
    },
    targetType: 'woff2',
});
