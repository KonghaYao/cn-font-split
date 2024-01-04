import { test, expect } from '@playwright/test';
import { compareElAndSave, comparePictureBuffer } from './comparePictureBuffer';
import fs from 'fs-extra';
import P from 'pngjs';
const PNG = P.PNG;
test('多构建方式：成品测试', async ({ page }) => {
    await page.goto('http://localhost:5173/#/article?type=multi-platform');
    await page.waitForLoadState('networkidle');
    const fonts = await page.locator('.example-font');

    const fontIndex = await fonts.count();
    const base = await fonts.nth(0).screenshot();
    for (let i = 1; i < fontIndex; ++i) {
        const item = await fonts.nth(i).screenshot();
        const { pixelDiffCount, diff } = comparePictureBuffer(base, item, {
            threshold: 0.3,
        });
        fs.outputFile('./temp/index-' + i + '.png', PNG.sync.write(diff));
        expect(pixelDiffCount).toBeLessThanOrEqual(40);
    }
});
test('可变字重测试', async ({ page }) => {
    await page.goto('http://localhost:5173/#/article?type=vf');
    await page.waitForLoadState('networkidle');
    await compareElAndSave(
        page,
        '.vf-base',
        '.vf-demo',
        './temp/SourceHanSerifSC-VF/base-demo.diff.png',
    );
});
const tag = [
    'Smileys and emotions',
    'People',
    'Animals and nature',
    'Food and drink',
    'Travel and places',
    'Activities and events',
    'Objects',
    'Symbols',
    'Flags',
];
for (const iterator of tag) {
    test('表情包字体' + iterator, async ({ page }) => {
        await page.goto(
            'http://localhost:5173/#/article?type=noto-color-emoji',
        );
        await page.waitForLoadState('networkidle');

        await compareElAndSave(
            page,
            `#${iterator}-base`,
            `#${iterator}-demo`,
            `./temp/NotoColorEmoji/${iterator}.diff.png`,
        );
    });
}
