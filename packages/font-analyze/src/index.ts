import { RenderOptions, parse } from '@konghayao/opentype.js';
import { getCharsetReport } from './Charset/getCharsetReport.js';
import {
    defaultCharsetLoader,
    CharsetLoader,
} from './Charset/defaultCharsetLoader.js';
import { getFeatureReport } from './Feature/index.js';

export * from './Charset/defaultCharsetLoader.js';

/** 分析字体中的字符集和字型相关信息 */
export const FontAnalyze = async (
    input: Buffer | ArrayBuffer,
    { charsetLoader = defaultCharsetLoader }: { charsetLoader: CharsetLoader },
) => {
    const font = parse(input);

    const headers = font.tables.name;
    console.table(headers);

    // 获取包中的所有 unicode
    const meta = font.tables.cmap.glyphIndexMap;
    const unicodeSet = new Set(Object.keys(meta).map((i) => parseInt(i)));
    // 软件需要在浏览器运行，所以按需加载比较合适
    const { unicodeReport, standard } = await getCharsetReport(
        charsetLoader,
        font,
        unicodeSet,
    );
    const features = getFeatureReport(font, unicodeSet);
    return {
        file: {
            size: input.byteLength,
            char_count: unicodeSet.size,
        },
        /** 字体头部信息 */
        headers,
        /** unicode 字符集合检测 */
        unicode: unicodeReport,
        /** 各大标准字符集检测 */
        standard,
        /** opentype feature 的替换表 */
        features,
        /** 将文本绘制成图片 */
        drawTextToSVG(
            text: string,
            x: number,
            y: number,
            fontSize: number,
            options?: RenderOptions,
        ) {
            return font
                .getPaths(text, x, y, fontSize, options)
                .map((i) => i.toSVG(1));
        },
    };
};
