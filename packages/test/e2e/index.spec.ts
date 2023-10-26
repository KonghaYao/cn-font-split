import { test, expect } from '@playwright/test';

test('多构建方式：成品测试', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    const fonts = await page.locator('.example-font');

    const fontIndex = await fonts.count();
    await fonts.nth(0).screenshot({ path: './temp/e2e/test-font.png' });
    for (let i = 1; i < fontIndex; ++i) {
        const item = await fonts
            .nth(i)
            .screenshot({ path: `./temp/test-font-${i}.png` });
        await expect(item).toMatchSnapshot('./temp/e2e/test-font.png');
    }
});
