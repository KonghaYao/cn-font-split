/**
 * @file ttf字符串相关函数
 * @author mengke01(kekee000@gmail.com) konghayao
 * @modifiedBy konghayao
 *
 * references:
 * 1. svg2ttf @ github
 */

import { unicodeName } from "../enum/unicodeName";
import { postName } from "../enum/postName";

/**
 * 将unicode编码转换成js内部编码，
 * 有时候单子节的字符会编码成类似`\u0020`, 这里还原单字节
 *
 * @param {string} str str字符串
 * @return {string} 转换后字符串
 */
export function stringify(str: string): string {
    if (!str) {
        return str;
    }

    let newStr = "";
    for (let i = 0, l = str.length, ch; i < l; i++) {
        ch = str.charCodeAt(i);
        if (ch === 0) {
            continue;
        }
        newStr += String.fromCharCode(ch);
    }
    return newStr;
}
/**
 * 将双字节编码字符转换成`\uxxxx`形式
 *
 * @param {string} str str字符串
 * @return {string} 转换后字符串
 */
export const escape = (str: string): string => {
    if (!str) {
        return str;
    }
    return String(str).replace(/[\uff-\uffff]/g, (c) =>
        escape(c).replace("%", "\\")
    );
};
/**
 * bytes to string
 *
 * @param  {Array} bytes 字节数组
 * @return {string}       string
 */
export function getString(bytes: Uint8Array): string {
    let s = "";
    for (let i = 0, l = bytes.length; i < l; i++) {
        s += String.fromCharCode(bytes[i]);
    }
    return s;
}
/**
 * 获取unicode的名字值
 *
 * @param {number} unicode unicode
 * @return {string} 名字
 */
export function getUnicodeName(unicode: number): string {
    const unicodeNameIndex = unicodeName[unicode];
    if (undefined !== unicodeNameIndex) {
        return postName[unicodeNameIndex];
    }

    return "uni" + unicode.toString(16).toUpperCase();
}
/**
 * 转换成utf8的字节数组
 *
 * @param {string} str 字符串
 * @return {Array.<byte>} 字节数组
 */
export function toUTF8Bytes(str: string): Array<number> {
    str = stringify(str);
    const byteArray: number[] = [];
    for (let i = 0, l = str.length; i < l; i++) {
        if (str.charCodeAt(i) <= 0x7f) {
            byteArray.push(str.charCodeAt(i));
        } else {
            const codePoint = str.codePointAt(i) as number;
            if (codePoint > 0xffff) {
                i++;
            }
            const h = encodeURIComponent(String.fromCodePoint(codePoint))
                .slice(1)
                .split("%");
            for (let j = 0; j < h.length; j++) {
                byteArray.push(parseInt(h[j], 16));
            }
        }
    }
    return byteArray;
}
/**
 * 转换成usc2的字节数组
 *
 * @param {string} str 字符串
 * @return {Array.<byte>} 字节数组
 */
export function toUCS2Bytes(str: string): Array<number> {
    str = stringify(str);
    const byteArray: number[] = [];

    for (let i = 0, l = str.length, ch; i < l; i++) {
        ch = str.charCodeAt(i);
        byteArray.push(ch >> 8);
        byteArray.push(ch & 0xff);
    }

    return byteArray;
}
/**
 * 获取pascal string 字节数组
 *
 * @param {string} str 字符串
 * @return {Array.<byte>} byteArray byte数组
 */
export function toPascalStringBytes(str: string): Array<number> {
    const bytes: number[] = [];
    const length = str ? (str.length < 256 ? str.length : 255) : 0;
    bytes.push(length);

    for (let i = 0, l = str.length; i < l; i++) {
        const c = str.charCodeAt(i);
        // non-ASCII characters are substituted with '*'
        bytes.push(c < 128 ? c : 42);
    }

    return bytes;
}
/**
 * utf8字节转字符串
 *
 * @param {Array} bytes 字节
 * @return {string} 字符串
 */
export function getUTF8String(bytes: number[]): string {
    let str = "";
    for (let i = 0, l = bytes.length; i < l; i++) {
        if (bytes[i] < 0x7f) {
            str += String.fromCharCode(bytes[i]);
        } else {
            str += "%" + (256 + bytes[i]).toString(16).slice(1);
        }
    }

    return unescape(str);
}
/**
 * ucs2字节转字符串
 *
 * @param {Array} bytes 字节
 * @return {string} 字符串
 */
export function getUCS2String(bytes: number[]): string {
    let str = "";
    for (let i = 0, l = bytes.length; i < l; i += 2) {
        str += String.fromCharCode((bytes[i] << 8) + bytes[i + 1]);
    }
    return str;
}
/**
 * 读取 pascal string
 *
 * @param {Array.<byte>} byteArray byte数组
 * @return {Array.<string>} 读取后的字符串数组
 */
export function getPascalString(byteArray: Uint8Array): Array<string> {
    const strArray: string[] = [];
    let i = 0;
    const l = byteArray.length;

    while (i < l) {
        let strLength = byteArray[i++];
        let str = "";

        while (strLength-- > 0 && i < l) {
            str += String.fromCharCode(byteArray[i++]);
        }
        // 这里需要将unicode转换成js编码
        str = stringify(str);
        strArray.push(str);
    }

    return strArray;
}
export default {
    stringify,
    escape,

    getString,

    getUnicodeName,
    toUTF8Bytes,
    toUCS2Bytes,
    toPascalStringBytes,

    getUTF8String,

    getUCS2String,

    getPascalString,
};
