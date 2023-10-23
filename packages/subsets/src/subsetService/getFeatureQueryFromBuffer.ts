import gsub from '@konghayao/opentype.js/src/tables/gsub.js';
import parse from '@konghayao/opentype.js/src/parse.js';
import Substitution from '@konghayao/opentype.js/src/substitution.js';
import type { Substitution as _Substitution } from 'opentype.js';
/**
 * Parses OpenType table entries.
 */
function parseOpenTypeTableEntries(data: DataView, numTables: number) {
    const tableEntries: {
        tag: string;
        checksum: any;
        offset: any;
        length: any;
        compression: boolean;
    }[] = [];
    let p = 12;
    for (let i = 0; i < numTables; i += 1) {
        const tag = parse.getTag(data, p);
        const checksum = parse.getULong(data, p + 4);
        const offset = parse.getULong(data, p + 8);
        const length = parse.getULong(data, p + 12);
        tableEntries.push({
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

export const getFeatureQueryFromBuffer = (
    buffer: ArrayBuffer
): _Substitution => {
    const font = {
        tables: {},
        outlinesFormat: 'truetype',
    };
    const data = new DataView(buffer, 0);
    const numTables = parse.getUShort(data, 4);
    const tableEntries = parseOpenTypeTableEntries(data, numTables);
    const gsubTableEntry = tableEntries.find((i) => i.tag === 'GSUB')!;
    const gsubTable = { data, offset: gsubTableEntry.offset };
    /**@ts-ignore */
    font.tables.gsub = gsub.parse(gsubTable.data, gsubTable.offset);
    return new Substitution(font) as any;
};
