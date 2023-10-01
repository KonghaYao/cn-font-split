import { Charset, FontSetMatch } from './FontSetMatch.js';
import { UnicodeCharset, UnicodeMatch } from './UnicodeMatch.js';
import { CharsetLoader } from './defaultCharsetLoader.js';

/** 获取 unicode 字符集检测报告 */
export async function getCharsetReport(
    charsetLoader: CharsetLoader,
    font: any,
    unicodeSet: Set<number>
) {
    const standard = await getCharsetStandard(charsetLoader, font, unicodeSet);
    // console.table(standard);
    const Unicode = await charsetLoader('unicodes.json');
    const unicodeReport = UnicodeMatch(
        font,
        unicodeSet,
        Unicode as UnicodeCharset
    );
    return { unicodeReport, standard };
}
/** 获取标准字符集数据 */
async function getCharsetStandard(
    charsetLoader: CharsetLoader,
    font: any,
    unicodeSet: Set<number>
) {
    return await Promise.all(
        [
            ['gb2312.json', 'GB/T 2312'],
            ['changyong-3500.json', '现代汉语常用字表'],
            ['tongyong-7000.json', '现代汉语通用字表'],
            ['yiwu-jiaoyu.json', '义务教育语文课程常用字表'],
            ['tongyong-guifan.json', '通用规范汉字表'],
            ['hanyi-jianfan.json', '汉仪简繁字表'],
            ['fangzheng-jianfan.json', '方正简繁字表'],
            ['iicore.json', '国际表意文字核心（IICore）'],
            ['gbk.json', 'GBK'],
            ['changyong4808.json', '常用国字标准字体表'],
            ['cichangyong-6343.json', '次常用国字标准字体表'],
            ['big5-changyong.json', 'Big5 常用汉字表'],
            ['big5.json', 'Big5'],
            ['hk-changyong.json', '常用字字形表（香港）'],
            ['hk-hkscs.json', '香港增补字符集'],
            ['hk-suppchara.json', '常用香港外字表'],
        ].map(async ([_path, name]) => {
            const set = await charsetLoader(_path);
            return FontSetMatch(font, unicodeSet, set as Charset, name);
        })
    );
}
