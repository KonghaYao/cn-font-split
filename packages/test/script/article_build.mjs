import { fontSplit } from 'cn-font-split';

await fontSplit({
    outDir: './temp/SourceHanSerifSC-VF/',
    input: './temp/font/SourceHanSerifSC-VF.otf',
    reporter: false,
    testHTML: false,
    css: {
        fontFamily: 'SourceHanSerifSC-VF-demo',
    },
});
await fontSplit({
    outDir: './temp/NotoColorEmoji/',
    input: './temp/font/NotoColorEmoji.ttf',
    reporter: false,
    testHTML: false,
    css: {
        fontFamily: 'NotoColorEmoji-demo',
    },
});
