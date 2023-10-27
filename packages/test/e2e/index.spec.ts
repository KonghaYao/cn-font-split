import { test, expect } from '@playwright/test';
import { comparePictureBuffer } from './comparePictureBuffer';

test('多构建方式：成品测试', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    const fonts = await page.locator('.example-font');

    const fontIndex = await fonts.count();
    const base = await fonts.nth(0).screenshot();
    for (let i = 1; i < fontIndex; ++i) {
        const item = await fonts.nth(i).screenshot();
        expect(
            comparePictureBuffer(base, item, { threshold: 0.3 }).pixelDiffCount
        ).toBeLessThanOrEqual(500);
    }
});
