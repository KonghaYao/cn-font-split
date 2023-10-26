import { test, expect } from '@playwright/test';

test('compare font style', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    const fonts = await page.locator('.example-font');

    const fontIndex = await fonts.count();
    await fonts.nth(0).screenshot({ path: './temp/test-font.png' });
    for (let i = 1; i < fontIndex; ++i) {
        const item = await fonts
            .nth(i)
            .screenshot({ path: `./temp/test-font-${i}.png` });
        await expect(item).toMatchSnapshot('./temp/test-font.png');
    }
});
