// 修改自 opentype.js 项目，需要自定义操作以减少打包代码量
import gsub from '@konghayao/opentype.js/src/tables/gsub.js';
import parse from '@konghayao/opentype.js/src/parse.js';
import Substitution from '@konghayao/opentype.js/src/substitution.js';
import type { Font, Substitution as _Substitution } from 'opentype.js';
/**
 * Parses OpenType table entries.
 */
function parseOpenTypeTableEntries(data: DataView, numTables: number) {
    const tableEntries = new Map<
        string,
        {
            tag: string;
            checksum: number;
            offset: number;
            length: number;
            compression: string | boolean;
        }
    >();
    let p = 12;
    for (let i = 0; i < numTables; i += 1) {
        const tag = parse.getTag(data, p);
        const checksum = parse.getULong(data, p + 4);
        const offset = parse.getULong(data, p + 8);
        const length = parse.getULong(data, p + 12);
        tableEntries.set(tag, {
            tag: tag,
            checksum: checksum,
            offset: offset,
            length: length,
            compression: false,
        });
        p += 16;
    }

    return tableEntries;
}
/**
 * Parses WOFF table entries.
 */
function parseWOFFTableEntries(data: DataView, numTables: number) {
    const tableEntries = new Map<
        string,
        {
            tag: string;
            compressedLength?: number;
            offset: number;
            length: number;
            compression: string | boolean;
        }
    >();
    let p = 44; // offset to the first table directory entry.
    for (let i = 0; i < numTables; i += 1) {
        const tag = parse.getTag(data, p);
        const offset = parse.getULong(data, p + 4);
        const compLength = parse.getULong(data, p + 8);
        const origLength = parse.getULong(data, p + 12);
        let compression;
        if (compLength < origLength) {
            compression = 'WOFF';
        } else {
            compression = false;
        }

        tableEntries.set(tag, {
            tag: tag,
            offset: offset,
            compression: compression,
            compressedLength: compLength,
            length: origLength,
        });
        p += 20;
    }

    return tableEntries;
}
export type FontBaseTool = ReturnType<typeof createFontBaseTool>;
export const createFontBaseTool = (buffer: ArrayBuffer) => {
    if (buffer.constructor !== ArrayBuffer) {
        buffer = new Uint8Array(buffer).buffer;
    }
    const data = new DataView(buffer, 0);
    let font = {
        outlinesFormat: '',
    };
    let numTables;
    let tableEntries:
        | ReturnType<typeof parseOpenTypeTableEntries>
        | ReturnType<typeof parseWOFFTableEntries>;
    const signature = parse.getTag(data, 0);
    if (
        signature === String.fromCodePoint(0, 1, 0, 0) ||
        signature === 'true' ||
        signature === 'typ1'
    ) {
        font.outlinesFormat = 'truetype';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'OTTO') {
        font.outlinesFormat = 'cff';
        numTables = parse.getUShort(data, 4);
        tableEntries = parseOpenTypeTableEntries(data, numTables);
    } else if (signature === 'wOFF') {
        const flavor = parse.getTag(data, 4);
        if (flavor === String.fromCodePoint(0, 1, 0, 0)) {
            font.outlinesFormat = 'truetype';
        } else if (flavor === 'OTTO') {
            font.outlinesFormat = 'cff';
        } else {
            throw new Error('Unsupported OpenType flavor ' + signature);
        }

        numTables = parse.getUShort(data, 12);
        tableEntries = parseWOFFTableEntries(data, numTables);
    } else if (signature === 'wOF2') {
        var issue =
            'https://github.com/opentypejs/opentype.js/issues/183#issuecomment-1147228025';
        throw new Error(
            'WOFF2 require an external decompressor library, see examples at: ' +
                issue,
        );
    } else {
        throw new Error('Unsupported OpenType signature ' + signature);
    }
    return {
        tableEntries,
        data,
        font: {
            tables: {},
            outlinesFormat: 'truetype',
        } as unknown as Font,
        getTable(
            parser: { parse: Function },
            name: string,
            ...args: unknown[]
        ) {
            const binary = tableEntries.get(name)!;
            if (!binary) return;
            const table = uncompressTable(data, binary);
            return parser.parse(table.data, table.offset, ...args);
        },
    };
};

/** 访问文件中的 feature 信息 */
export const getFeatureQueryFromBuffer = (
    tool: FontBaseTool,
): {
    getFeature(i: string): { sub: number | number[]; by: number | number[] }[];
} => {
    tool.font.tables.gsub = tool.getTable(gsub, 'GSUB');
    return new Substitution(tool.font);
};

export const getFVarTable = (tool: FontBaseTool) => {
    return tool.getTable(fvar, 'fvar');
};

import name from '@konghayao/opentype.js/src/tables/name.js';
import fvar from '@konghayao/opentype.js/src/tables/fvar.js';
import ltag from '@konghayao/opentype.js/src/tables/ltag.js';

/** 从字体中读取 name table */
export const getNameTableFromTool = (tool: FontBaseTool) => {
    const ltagTableInfo = tool.getTable(ltag, 'ltag')!;
    const nameTableInfo = tool.getTable(name, 'name', ltagTableInfo)!;
    tool.font.tables.name = nameTableInfo;
    return nameTableInfo;
};

import cmap from '@konghayao/opentype.js/src/tables/cmap.js';
export const getCMapFromTool = (tool: FontBaseTool) => {
    const _cmap = tool.getTable(cmap, 'cmap');
    tool.font.tables.cmap = _cmap;
    return _cmap;
};

/** 获取字体的 glyphID -> unicode[] 映射表 */
export function getGlyphIDToUnicodeMap(tool: FontBaseTool) {
    const font = tool.font;
    const _IndexToUnicodeMap = new Map<number, number[]>();
    if (!font.tables.cmap) getCMapFromTool(tool);
    const glyphIndexMap = font.tables.cmap.glyphIndexMap;
    const charCodes = Object.keys(glyphIndexMap);

    for (let i = 0; i < charCodes.length; i += 1) {
        const c = charCodes[i];
        const glyphIndex = glyphIndexMap[c];
        if (!_IndexToUnicodeMap.has(glyphIndex)) {
            _IndexToUnicodeMap.set(glyphIndex, [parseInt(c)]);
        } else {
            _IndexToUnicodeMap.get(glyphIndex)!.push(parseInt(c));
        }
    }
    return _IndexToUnicodeMap;
}
import { tinf_uncompress as inflate } from '@konghayao/opentype.js/src/tiny-inflate@1.0.3.esm.js'; // from code4fukui/tiny-inflate-es
function uncompressTable(data: DataView, tableEntry: any) {
    if (tableEntry.compression === 'WOFF') {
        console.log(tableEntry);
        const inBuffer = new Uint8Array(
            data.buffer,
            tableEntry.offset + 2,
            tableEntry.compressedLength - 2,
        );
        const outBuffer = new Uint8Array(tableEntry.length);
        inflate(inBuffer, outBuffer);
        if (outBuffer.byteLength !== tableEntry.length) {
            throw new Error(
                'Decompression error: ' +
                    tableEntry.tag +
                    " decompressed length doesn't match recorded length",
            );
        }

        const view = new DataView(outBuffer.buffer, 0);
        return { data: view, offset: 0 };
    } else {
        return { data: data, offset: tableEntry.offset };
    }
}
