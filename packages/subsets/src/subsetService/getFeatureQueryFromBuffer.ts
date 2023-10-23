//
import gsub from '@konghayao/opentype.js/src/tables/gsub.js';
import parse from '@konghayao/opentype.js/src/parse.js';
import Substitution from '@konghayao/opentype.js/src/substitution.js';
import type { Substitution as _Substitution } from 'opentype.js';
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
        },
    };
};

/** 访问文件中的 feature 信息 */
export const getFeatureQueryFromBuffer = (
    tool: FontBaseTool
): {
    getFeature(i: string): { sub: number | number[]; by: number | number[] }[];
} => {
    const gsubTableEntry = tool.tableEntries.get('GSUB')!;
    const gsubTable = { data: tool.data, offset: gsubTableEntry.offset };
    /**@ts-ignore */
    tool.font.tables.gsub = gsub.parse(gsubTable.data, gsubTable.offset);
    return new Substitution(tool.font) as any;
};
import name from '@konghayao/opentype.js/src/tables/name.js';
import ltag from '@konghayao/opentype.js/src/tables/ltag.js';

/** 从字体中读取 name table */
export const getNameTableFromTool = (tool: FontBaseTool) => {
    const nameTable = tool.tableEntries.get('name')!;
    const ltagTableData = tool.tableEntries.get('ltag')!;
    let ltagTableInfo =
        ltagTableData && ltag.parse(tool.data, ltagTableData.offset);

    const nameTableInfo = name.parse(
        tool.data,
        nameTable.offset,
        ltagTableInfo
    );
    /** @ts-ignore */
    tool.font.tables.name = nameTableInfo;
    return nameTableInfo;
};
