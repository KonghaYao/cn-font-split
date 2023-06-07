/**
 * @file 数据读取器
 * @author mengke01(kekee000@gmail.com) konghayao
 * @modifyBy konghayao
 *
 * thanks to：
 * ynakajima/ttf.js
 * https://github.com/ynakajima/ttf.js
 */
import { dataType } from "./dataType.js";

export class Reader {
    offset: number;
    length: number;
    littleEndian: boolean;
    view: DataView;
    /**
     * 读取器
     *
     * @constructor
     * @param {Array.<byte>} buffer 缓冲数组
     * @param {number} offset 起始偏移
     * @param {number} length 数组长度
     * @param {boolean} littleEndian 是否小尾
     */
    constructor(
        buffer: ArrayBuffer,
        offset: number,
        length: number,
        littleEndian?: boolean
    ) {
        this.offset = offset;
        this.length = length;
        this.littleEndian = littleEndian || false;
        this.view = new DataView(buffer, this.offset, this.length);
    }
    readUint16(offset?: number, littleEndian?: boolean) {
        return this.read("Uint16", offset, littleEndian);
    }
    /**
     * 读取指定的数据类型
     *
     * @param {string} type 数据类型
     * @param {number=} offset 位移
     * @param {boolean=} littleEndian 是否小尾
     * @return {number} 返回值
     */
    read(
        type: keyof typeof dataType,
        offset?: number,
        littleEndian?: boolean
    ): number {
        // 使用当前位移
        if (undefined === offset) {
            offset = this.offset;
        }
        // 使用小尾
        if (undefined === littleEndian) {
            littleEndian = this.littleEndian;
        }
        // // 扩展方法
        // if (undefined === dataType[type]) {
        //     return this[("read" + type) as const](offset, littleEndian);
        // }
        const size = dataType[type];
        this.offset = offset + size;
        type GetTypeFunction = `get${keyof typeof dataType}`;
        const key = ("get" + type) as GetTypeFunction;
        return this.view[key](offset, littleEndian);
    }
    /**
     * 获取指定的字节数组
     *
     * @param {number} offset 偏移
     * @param {number} length 字节长度
     * @return {Array} 字节数组
     */
    readBytes(offset: number, length: number | null = null): Array<number> {
        if (length == null) {
            length = offset;
            offset = this.offset;
        }
        if (length < 0 || offset + length > this.length) {
            console.error(10001, this.length, offset + length);
        }
        const buffer: number[] = [];
        for (let i = 0; i < length; ++i) {
            buffer.push(this.view.getUint8(offset + i));
        }
        this.offset = offset + length;
        return buffer;
    }
    /**
     * 读取一个string
     *
     * @param {number} offset 偏移
     * @param {number} length 长度
     * @return {string} 字符串
     */
    readString(offset: number, length: number | null = null): string {
        if (length == null) {
            length = offset;
            offset = this.offset;
        }
        if (length < 0 || offset + length > this.length) {
            console.error(10001, this.length, offset + length);
        }
        let value = "";
        for (let i = 0; i < length; ++i) {
            const c = this.read("Uint8", offset + i);
            value += String.fromCharCode(c);
        }
        this.offset = offset + length;
        return value;
    }
    /**
     * 读取一个字符
     *
     * @param {number} offset 偏移
     * @return {string} 字符串
     */
    readChar(offset: number): string {
        return this.readString(offset, 1);
    }
    /**
     * 读取一个uint24整形
     *
     * @param {number} offset 偏移
     * @return {number}
     */
    readUint24(offset: number): number {
        const [i, j, k] = this.readBytes(offset || this.offset, 3);
        return (i << 16) + (j << 8) + k;
    }
    /**
     * 读取fixed类型
     *
     * @param {number} offset 偏移
     * @return {number} float
     */
    readFixed(offset: number): number {
        if (undefined === offset) {
            offset = this.offset;
        }
        const val = this.read("Int32", offset, false) / 65536.0;
        return Math.ceil(val * 100000) / 100000;
    }

    /**
     * 读取长日期
     *
     * @param {number} offset 偏移
     * @return {Date} Date对象
     */
    readLongDateTime(offset: number): Date {
        if (undefined === offset) {
            offset = this.offset;
        }
        // new Date(1970, 1, 1).getTime() - new Date(1904, 1, 1).getTime();
        const delta = -2077545600000;
        const time = this.read("Uint32", offset + 4, false);
        const date = new Date();
        date.setTime(time * 1000 + delta);
        return date;
    }

    /**
     * 跳转到指定偏移
     *
     * @param {number} offset 偏移
     * @return {Object} this
     */
    seek(offset: number): object {
        if (undefined === offset) {
            this.offset = 0;
        }
        if (offset < 0 || offset > this.length) {
            console.error(10001, this.length, offset);
        }
        this.offset = offset;
        return this;
    }
    /**
     * 注销
     */
    dispose() {
        /** @ts-ignore */
        delete this.view;
    }
}
