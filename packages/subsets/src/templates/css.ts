import { VFMessage } from '../fontSplit/context';
import { InputTemplate, SubsetResult } from '../interface';
import { createHeaderComment } from './css/createHeaderComment';
import { getFormatFromFontPath } from './css/getFormatFromFontPath';
import { subFamilyToWeight } from './css/subFamilyToWeight';
import type { NameTable } from './reporter';
import { UnicodeRange } from '@japont/unicode-range';
export const isItalic = (str: string) => {
    return str.toLowerCase().includes('italic');
};

const createUnicodeCommentForPackage = (range: string) => {
    return `/* ${String.fromCharCode(
        ...UnicodeRange.parse(range.split(',')),
    )} */`;
};

export const createCSS = (
    subsetResult: SubsetResult,
    nameTable: { windows?: NameTable; macintosh?: NameTable },
    opts: InputTemplate['css'],
    VFOpts: VFMessage | null,
) => {
    const fontData = Object.fromEntries(
        Object.entries(nameTable?.windows ?? nameTable?.macintosh ?? {}).map(
            ([key, val]) => {
                return [key, typeof val === 'string' ? val : val.en];
            },
        ),
    );
    const css = opts || {};
    const commentSetting = opts?.comment || {};
    const family =
        // fontData.preferredFamily  不使用这个，因为这个容易引起歧义
        css.fontFamily || fontData.fontFamily;

    const preferredSubFamily =
        fontData.preferredSubFamily ||
        fontData.fontSubFamily ||
        fontData.fontSubfamily ||
        '';

    const style =
        css.fontStyle || (isItalic(preferredSubFamily) ? 'italic' : 'normal');

    const locals = createLocalsString(css, fontData);

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

    const weight =
        css.fontWeight ||
        getFontWeightForVF(VFOpts) ||
        subFamilyToWeight(preferredSubFamily);
    const display = css.fontDisplay || 'swap';
    const cssStyleSheet = subsetResult
        //  反转数组，使得 feature 在后面覆盖前面的 feature
        .reverse()
        .map(({ path, unicodeRange }) => {
            const str = `@font-face {
font-family: "${family}";
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
            const comment =
                commentSetting.unicodes === true
                    ? createUnicodeCommentForPackage(unicodeRange) + '\n'
                    : '';
            return (
                comment +
                (css.compress !== false ? str.replace(/\n/g, '') : str)
            );
        })
        .join('\n');
    const header = createHeaderComment(fontData, opts);
    return { css: header + cssStyleSheet, family, style, weight, display };
};

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
