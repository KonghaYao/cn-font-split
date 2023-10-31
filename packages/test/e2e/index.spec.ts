import { test, expect } from '@playwright/test';
import { comparePictureBuffer } from './comparePictureBuffer';
import fs from 'fs-extra';
import P from 'pngjs';
const PNG = P.PNG;
test('多构建方式：成品测试', async ({ page }) => {
    await page.goto('http://localhost:5173/#/article');
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
