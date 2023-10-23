import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { FeatureList } from '../src/data/FeatureList';
import { createFontBaseTool, getFeatureQueryFromBuffer, getNameTableFromTool } from '../src/subsetService/getFeatureQueryFromBuffer';
// 测试本地的 opentype feature polyfill 与原始代码的一致性
describe('opentype.js feature 一致性', async () => {
    const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');
    const f = (await import('@konghayao/opentype.js/src/index')).parse(buffer);
    FeatureList.forEach((a) => {
        it(a, () => {
            const tool = createFontBaseTool(buffer.buffer)
            expect(getFeatureQueryFromBuffer(tool).getFeature(a)).eql(
                f.substitution.getFeature(a)
            );
        });
    });
});
describe('opentype.js nameTables 一致性', async () => {
    const buffer = fs.readFileSync('../demo/public/SmileySans-Oblique.ttf');
    const f = (await import('@konghayao/opentype.js/src/index')).parse(buffer);
    const tool = createFontBaseTool(buffer.buffer)
    it('name table', () => {
        expect(getNameTableFromTool(tool)).eql(
            f.names
        );
    });
});
