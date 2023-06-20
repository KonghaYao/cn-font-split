/**
 * @file name表解析操作
 * @author mengke01(kekee000@gmail.com) modified by KonghaYao KonghaYao
 * harfbuzz 没有给解析的函数，那就只能自己来了。。。
 */

import { mac, win, platformTbl } from "./enum/platform";
import { nameIdTbl } from "./nameIdTbl";
import { getUTF8String, getUCS2String } from "./utils/string";
import { Reader } from "./reader";

type NameRecord = {
    name: number[];
    platform: number;
    encoding: number;
    language: number;
    nameId: number;
    length: number;
    offset: number;
};
/** 配合 hbjs 中的 face 使用
 *
 * @example const res = face.reference_table("name");
 *  decodeNameTableFromUint8Array(res)

*/
export const decodeNameTableFromUint8Array = (nameTable: Uint8Array) => {
    const reader = new Reader(
        nameTable.buffer,
        nameTable.byteOffset,
        nameTable.byteLength
    );
    let offset = 0;
    reader.seek(offset);

    /**@ts-ignore */
    const nameTbl: { format: number; count: number; stringOffset: number } = {};
    // 顺序不可变
    nameTbl.format = reader.read("Uint16");
    nameTbl.count = reader.read("Uint16");
    nameTbl.stringOffset = reader.read("Uint16");

    let nameRecordTbl: NameRecord[] = [];
    const count = nameTbl.count;

    for (let i = 0; i < count; ++i) {
        const nameRecord: Partial<NameRecord> = {};
        nameRecord.platform = reader.read("Uint16");
        nameRecord.encoding = reader.read("Uint16");
        nameRecord.language = reader.read("Uint16");
        nameRecord.nameId = reader.read("Uint16");
        nameRecord.length = reader.read("Uint16");
        nameRecord.offset = reader.read("Uint16");
        nameRecordTbl.push(nameRecord as NameRecord);
    }
    offset += nameTbl.stringOffset;

    // 读取字符名字
    nameRecordTbl = nameRecordTbl.map((i) => {
        const name = reader.readBytes(offset + i.offset, i.length);
        return { ...i, name };
    });

    const names: Record<string, string> = {};

    /** 确认 name 表的字符文本编码方式 */
    const ensureEnv = () => {
        // 如果有windows 下的 english，则用windows下的 name
        if (
            nameRecordTbl.some(
                (record) =>
                    record.platform === platformTbl.Microsoft &&
                    record.encoding === win.UCS2 &&
                    record.language === 1033
            )
        ) {
            return {
                platform: platformTbl.Microsoft,
                encoding: win.UCS2,
                language: 1033,
            };
        }
        return {
            // mac 下的english name
            platform: platformTbl.Macintosh,
            encoding: mac.Default,
            language: 0,
        };
    };
    const { platform, encoding, language } = ensureEnv();
    nameRecordTbl.forEach((nameRecord) => {
        if (
            nameRecord.platform === platform &&
            nameRecord.encoding === encoding &&
            nameRecord.language === language
        ) {
            if (nameRecord.nameId in nameIdTbl) {
                const key = nameIdTbl[nameRecord.nameId];

                names[key] =
                    language === 0
                        ? getUTF8String(nameRecord.name!)
                        : getUCS2String(nameRecord.name!);
            } else {
                console.warn(
                    "name table decode: found an unknown key in your font file, key",
                    nameRecord.nameId,
                    "value",
                    language === 0
                        ? getUTF8String(nameRecord.name)
                        : getUCS2String(nameRecord.name)
                );
            }
        }
    });

    return names;
};
