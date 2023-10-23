//
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
    tool: FontBaseTool
): {
    getFeature(i: string): { sub: number | number[]; by: number | number[] }[];
} => {
    /**@ts-ignore */
    tool.font.tables.gsub = tool.getTable(gsub, 'GSUB');
    return new Substitution(tool.font) as any;
};
import name from '@konghayao/opentype.js/src/tables/name.js';
import ltag from '@konghayao/opentype.js/src/tables/ltag.js';

/** 从字体中读取 name table */
export const getNameTableFromTool = (tool: FontBaseTool) => {
    let ltagTableInfo = tool.getTable(ltag, 'ltag')!;
    const nameTableInfo = tool.getTable(name, 'name', ltagTableInfo)!;
    /** @ts-ignore */
    tool.font.tables.name = nameTableInfo;
    return nameTableInfo;
};

import head from '@konghayao/opentype.js/src/tables/head.js';
import loca from '@konghayao/opentype.js/src/tables/loca.js';
import glyf from '@konghayao/opentype.js/src/tables/glyf.js';
import maxp from '@konghayao/opentype.js/src/tables/maxp.js';
export const getGlyphFromTool = (tool: FontBaseTool) => {
    const indexToLocFormat = tool.getTable(head, 'head').indexToLocFormat;
    const shortVersion = indexToLocFormat === 0;
    const numGlyphs = tool.getTable(maxp, 'maxp').numGlyphs;
    const locaOffsets = tool.getTable(loca, 'loca', numGlyphs, shortVersion);
    const glyphs = tool.getTable(glyf, 'glyf', locaOffsets, tool.font, {})!;
    /** @ts-ignore */
    tool.font.glyphs = glyphs;
    return glyphs;
};

import cmap from '@konghayao/opentype.js/src/tables/cmap.js';
export const getCMapFromTool = (tool: FontBaseTool) => {
    return tool.getTable(cmap, 'cmap');
};
