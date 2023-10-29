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
            checksum: any;
            offset: any;
            length: any;
            compression: boolean;
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
export type FontBaseTool = ReturnType<typeof createFontBaseTool>;
export const createFontBaseTool = (buffer: ArrayBuffer) => {
    const data = new DataView(buffer, 0);
    const numTables = parse.getUShort(data, 4);
    const tableEntries = parseOpenTypeTableEntries(data, numTables);
    return {
        tableEntries,
        data,
        font: {
            tables: {},
            outlinesFormat: 'truetype',
        } as any as Font,
        getTable(parser: any, name: string, ...args: any[]) {
            const binary = this.tableEntries.get(name)!;
            return binary && parser.parse(this.data, binary.offset, ...args);
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
    return new Substitution(tool.font) as any;
};
import name from '@konghayao/opentype.js/src/tables/name.js';
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
