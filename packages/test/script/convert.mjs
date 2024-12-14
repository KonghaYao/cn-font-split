export const supportedFormats = new Set(['sfnt', 'woff', 'woff2']);

/** 检测字体类型 */
export const detectFormat = function (buffer) {
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
        console.log("woff2 ignore");
        return 'sfnt';
    } else {
        throw new Error(`Unrecognized font signature: ${signature}`);
    }
};
export const Extensions = {
    otf: 'otf',
    ttf: 'ttf',
    sfnt: 'otf',
    truetype: 'ttf',
    woff: 'woff',
    woff2: 'woff2',
};

/** 根据字体类型获取扩展名 */
export const getExtensionsByFontType = (targetType) => {
    return '.' + Extensions[targetType];
};

import {
    convertTTFToWOFF2Async,
    convertWOFF2ToTTFAsync,
} from '@napi-rs/woff-build';

/** 字体格式转化, node 特供版本，速度非常快，但是在跨平台构建方面会有产物不一致问题 */
export const convert = async function (
    buffer,
    toFormat,
    fromFormat,
) {
    const snft = ['truetype', 'ttf', 'otf'];
    if (snft.includes(toFormat)) {
        toFormat = 'sfnt';
    }
    if (snft.includes(fromFormat || '')) {
        fromFormat = 'sfnt';
    }
    if (!supportedFormats.has(toFormat)) {
        throw new Error(`Unsupported target format: ${toFormat}`);
    }
    if (fromFormat) {
        if (!supportedFormats.has(fromFormat)) {
            throw new Error(`Unsupported source format: ${fromFormat}`);
        }
    } else {
        fromFormat = detectFormat(buffer);
    }
    if (fromFormat === toFormat) {
        return buffer;
    }
    if (fromFormat === 'woff') {
        // buffer = woffTool.toSfnt(buffer);
        throw new Error('Unsupported source format: woff');
    } else if (fromFormat === 'woff2') {
        buffer = await convertWOFF2ToTTFAsync(buffer);
    }
    if (toFormat === 'woff2') {
        buffer = await convertTTFToWOFF2Async(buffer);
    }

    buffer = new Uint8Array(buffer);
    return buffer;
};
