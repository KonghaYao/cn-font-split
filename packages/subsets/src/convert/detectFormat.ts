export const supportedFormats = new Set(['sfnt', 'woff', 'woff2']);

/** 检测字体类型 */
export const detectFormat = function (buffer: Uint8Array) {
    const signature = String.fromCodePoint(...buffer.subarray(0, 4));
    if (signature === 'wOFF') {
        return 'woff';
    } else if (signature === 'wOF2') {
        return 'woff2';
    } else if (
        signature === 'true' ||
        signature === 'OTTO' ||
        signature === '\x00\x01\x00\x00'
    ) {
        return 'sfnt';
    } else {
        throw new Error(`Unrecognized font signature: ${signature}`);
    }
};
export type FontType = 'otf' | 'ttf' | 'truetype' | 'sfnt' | 'woff' | 'woff2';

export const Extensions = {
    otf: 'otf',
    ttf: 'ttf',
    sfnt: 'otf',
    truetype: 'ttf',
    woff: 'woff',
    woff2: 'woff2',
} as const;

/** 根据字体类型获取扩展名 */
export const getExtensionsByFontType = (targetType: FontType) => {
    return '.' + Extensions[targetType];
};
