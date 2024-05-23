// 计算分包结果的响应数据
import { UnicodeRange } from '@japont/unicode-range';
import size from 'byte-size';
import fs from 'node:fs';
/**
 * 返回给定文本中所有字符的Unicode编码
 * @param {string} text - 输入的文本
 * @returns {number[]} - 一个包含文本中所有字符Unicode编码的数组
 */
const getAllUnicodeFromText = (text) => {
    return new Set(text.split('').map((char) => char.charCodeAt(0)));
};
const getCharMap = (reporter) => {
    const charMap = new Map();
    reporter.data.forEach((d) =>
        UnicodeRange.parse(d.chars.split(',')).forEach((code) => {
            charMap.set(code, d);
        }),
    );
    return charMap;
};
const performanceTest = (text, charMap, usedPart = new Set()) => {
    const unicodeSet = getAllUnicodeFromText(text);
    let missed = 0;
    unicodeSet.forEach((i) => {
        if (charMap.has(i)) {
            usedPart.add(charMap.get(i));
        } else {
            missed++;
        }
    });
    const totalSize = [...usedPart].reduce((a, b) => a + (b.size ?? 0), 0);
    return {
        usedPart,
        missed,
        setLength: unicodeSet.size,
        totalSize,
        totalCount: usedPart.size,
        totalSizeName: size(totalSize).toString(),
    };
};

const texts = JSON.parse(fs.readFileSync('./temp/merged.json', 'utf-8'));

const baseMap = getCharMap(
    JSON.parse(fs.readFileSync('./temp/base/reporter.json', 'utf-8')),
);
const notoMap = getCharMap(
    JSON.parse(fs.readFileSync('./temp/noto/reporter.json', 'utf-8')),
);

const textSize = 2000;
const resultGrid = texts.slice(0, textSize).map((i) => {
    const base = performanceTest(i, baseMap);
    const noto = performanceTest(i, notoMap);
    return {
        setLength: base.setLength,
        baseSize: base.totalSizeName,
        baseCount: base.totalCount,
        diffSize: base.totalSize - noto.totalSize,
        diffCount: base.totalCount - noto.totalCount,
        notoSize: noto.totalSizeName,
        notoCount: noto.totalCount,
    };
});
console.table(resultGrid);
console.log(
    '平均差距',
    size(resultGrid.reduce((a, b) => a + b.diffSize, 0) / textSize).toString(),
    // resultGrid.reduce((a, b) => a + b.diffCount, 0) / textSize,
);
// console.log(texts[0]);
