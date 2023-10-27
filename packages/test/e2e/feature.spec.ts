import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');

test('feature 测试', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    for (const iterator of features) {
        const item1 = await page
            .locator('.' + iterator.featureKey)
            .screenshot({
                path: `./temp/features/test-feature-${iterator.featureKey}.png`,
            });
        const item2 = await page
            .locator('.' + iterator.featureKey + '-demo')
            .screenshot({
                path: `./temp/features/test-feature-${iterator.featureKey}-demo.png`,
            });
        await expect(item2).toMatchSnapshot(`./temp/features/test-feature-${iterator.featureKey}.png`);
    }
});
