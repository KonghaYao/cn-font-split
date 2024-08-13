import { VFMessage } from '../createContext';
import { InputTemplate, SubsetResult } from '../interface';
import { createHeaderComment } from './css/createHeaderComment';
import { getFormatFromFontPath } from './css/getFormatFromFontPath';
import { subFamilyToWeight } from './css/subFamilyToWeight';
import type { NameTable } from './reporter';
import { UnicodeRange } from '@japont/unicode-range';
/**
 * 根据字体子集结果和名称表生成CSS样式表。
 *
 * @param subsetResult 字体子集结果，包含子集的路径和Unicode范围。
 * @param nameTable 字体的名称表，用于获取字体家族等信息。
 * @param opts CSS模板选项，用于定制CSS样式。
 * @param VFOpts 可变字体选项，用于获取字体权重等信息。
 * @returns 返回一个对象，包含生成的CSS样式、字体家族、样式、权重和显示模式。
 */
export const createCSS = (
    subsetResult: SubsetResult,
    nameTable: { windows?: NameTable; macintosh?: NameTable },
    opts: InputTemplate['css'],
    VFOpts: VFMessage | null,
) => {
    // 从名称表中提取字体家族名称，优先使用windows平台的名称。
    const fontData = Object.fromEntries(
        Object.entries(nameTable?.windows ?? nameTable?.macintosh ?? {}).map(
            ([key, val]) => {
                return [key, typeof val === 'string' ? val : val.en];
            },
        ),
    );

    const css = opts || {};
    const commentSetting = opts?.comment || {};
    // 优先使用css中的字体家族名称，否则使用nameTable中的。
    const family =
        //! fontData.preferredFamily  不使用这个，因为这个容易引起歧义
        css.fontFamily || fontData.fontFamily;

    /** 优先使用preferredSubFamily，如果没有，则使用fontSubFamily或fontSubfamily。 */
    const preferredSubFamily =
        fontData.preferredSubFamily ||
        fontData.fontSubFamily ||
        fontData.fontSubfamily ||
        '';

    /** 根据子家族名称确定字体样式，如果是斜体，则为italic，否则为normal。 */
    const style =
        css.fontStyle || (isItalic(preferredSubFamily) ? 'italic' : 'normal');

    /** 创建本地字体声明字符串。 */
    const locals = createLocalsString(css, fontData);

    // 处理polyfill选项，将其转换为font-face声明中使用的格式。
    const polyfills =
        typeof css.polyfill === 'string'
            ? [
                  {
                      name: css.polyfill,
                      format: getFormatFromFontPath(css.polyfill),
                  },
              ]
            : css.polyfill?.map((i) =>
                  typeof i === 'string'
                      ? {
                            name: i,
                            format: getFormatFromFontPath(i),
                        }
                      : i,
              ) ?? [];

    /** 确定字体权重，优先使用css中的值，然后是可变字体选项中的，最后是根据子家族名称推断的。 */
    const weight =
        css.fontWeight ||
        getFontWeightForVF(VFOpts) ||
        subFamilyToWeight(preferredSubFamily);

    /** 设置字体显示模式，默认为'swap'。 */
    const display = css.fontDisplay || 'swap';

    const cssStyleSheet = subsetResult
        //!  反转数组，使得 feature 在后面覆盖前面的 feature
        .reverse()
        .map(({ path, unicodeRange }) => {
            const str = `@font-face {
font-family:"${family}";
src:${[
                ...locals,
                `url("./${path}") format("woff2")`,
                ...polyfills.map(
                    (i) =>
                        `url("${i.name}") ${
                            i.format ? `format("${i.format}")` : ''
                        }`,
                ),
            ].join(',')};
font-style: ${style};
${css.fontWeight !== false ? `font-weight: ${weight};` : ''}
font-display: ${display};
unicode-range:${unicodeRange};
}`; // css 这个句尾不需要分号😭
            // 根据注释设置生成Unicode范围的注释。
            const comment =
                commentSetting.unicodes === true
                    ? createUnicodeCommentForPackage(unicodeRange) + '\n'
                    : '';
            // 根据压缩选项返回压缩或未压缩的样式字符串。
            return (
                comment +
                (css.compress !== false ? str.replace(/\n/g, '') : str)
            );
        })
        .join('\n');
    const header = createHeaderComment(fontData, opts);
    return { css: header + cssStyleSheet, family, style, weight, display };
};
/**
 * 获取 VF 的字重,VF 字重形式不同
 * @example font-weight: 100 900;
 */
function getFontWeightForVF(VF: VFMessage | null) {
    if (!VF) return;
    if (VF.axes.length === 0) return;
    const weight = VF.axes.find((i) => i.tag === 'wght');
    if (!weight) return;
    if (
        typeof weight.minValue === 'number' &&
        typeof weight.maxValue === 'number'
    ) {
        return `${weight.minValue} ${weight.maxValue}`;
    }
    return;
}

/** 创建本地字体包，方便直接使用本地的字体 */
function createLocalsString(
    css: NonNullable<InputTemplate['css']>,
    fontData: Record<string, string>,
) {
    if (css?.localFamily === false) return [];
    const locals =
        typeof css.localFamily === 'string'
            ? [css.localFamily]
            : css.localFamily ?? [];
    locals.push(fontData.fontFamily);
    return locals.map((i) => `local("${i}")`);
}
/** 判断是否为斜体 */
export function isItalic(str: string) {
    return str.toLowerCase().includes('italic');
}

/** 创建 unicode 注释文本，方便调试 */
function createUnicodeCommentForPackage(range: string) {
    return `/* ${String.fromCodePoint(
        ...UnicodeRange.parse(range.split(',')),
    )} */`;
}
