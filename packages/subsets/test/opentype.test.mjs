import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { FeatureList } from '../src/data/FeatureList';
import {
    createFontBaseTool,
    getCMapFromTool,
    getFeatureQueryFromBuffer,
    getNameTableFromTool,
} from '../src/subsetService/getFeatureQueryFromBuffer';
// 测试本地的 opentype feature polyfill 与原始代码的一致性
describe('opentype.js feature 一致性', async () => {
    const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');
    const f = (
        await import('@konghayao/opentype.js/dist/opentype.module')
    ).parse(buffer);
    FeatureList.forEach((a) => {
        it(a, () => {
            const tool = createFontBaseTool(buffer.buffer);
            expect(getFeatureQueryFromBuffer(tool).getFeature(a)).eql(
                f.substitution.getFeature(a),
            );
        });
    });
});
describe('opentype.js nameTables 一致性', async () => {
    const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');
    const f = (
        await import('@konghayao/opentype.js/dist/opentype.module')
    ).parse(buffer);
    const tool = createFontBaseTool(buffer.buffer);
    it('name table', () => {
        expect(getNameTableFromTool(tool)).eql(f.names);
    });
});
describe('opentype.js cmap 一致性', async () => {
    const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');
    const f = (
        await import('@konghayao/opentype.js/dist/opentype.module')
    ).parse(buffer);
    const tool = createFontBaseTool(buffer.buffer);
    it('cmap', () => {
        expect(f.tables.cmap.glyphIndexMap).eql(
            getCMapFromTool(tool).glyphIndexMap,
        );
    });
    // 测试是正确的，耗时太长
    // it('unicodeMap',()=>{
    //     for (let i = 0; i < f.numGlyphs; i++) {
    //         const a = f.glyphs.get(i);
    //         const b = getGlyphIDToUnicodeMap(tool).get(i);
    //         expect(b??[]).eql(a.unicodes??[a.unicode]);
    //     }
    // })
});
