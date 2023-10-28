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
        ...UnicodeRange.parse(range.split(','))
    )} */`;
};

export const createCSS = (
    subsetResult: SubsetResult,
    nameTable: { windows?: NameTable; macintosh?: NameTable },
    opts: InputTemplate['css']
) => {
    const fontData = Object.fromEntries(
        Object.entries(nameTable?.windows ?? nameTable?.macintosh ?? {}).map(
            ([key, val]) => {
                return [key, typeof val === 'string' ? val : val.en];
            }
        )
    );
    const css = opts || {};
    const commentSetting = opts?.comment || {};
    const family =
        // fontData.preferredFamily  不使用这个，因为这个容易引起歧义
        css.fontFamily || fontData.fontFamily;

    const preferredSubFamily =
        fontData.preferredSubFamily || fontData.fontSubFamily || '';

    const style =
        css.fontStyle || (isItalic(preferredSubFamily) ? 'italic' : 'normal');

    const locals =
        typeof css.localFamily === 'string'
            ? [css.localFamily]
            : css.localFamily ?? [];
    locals.push(fontData.fontFamily);

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
                      : i
              ) ?? [];

    const weight = css.fontWeight || subFamilyToWeight(preferredSubFamily);
    const cssStyleSheet = subsetResult
        .map(({ path, unicodeRange }) => {
            let str = `@font-face {
font-family: "${family}";
src:${[
                ...locals.map((i) => `local("${i}")`),
                `url("./${path}") format("woff2")`,
                ...polyfills.map(
                    (i) =>
                        `url("${i.name}") ${
                            i.format ? `format("${i.format}")` : ''
                        }`
                ),
            ].join(',')};
font-style: ${style};
font-weight: ${weight};
font-display: ${css.fontDisplay || 'swap'};
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
    return header + cssStyleSheet;
};
