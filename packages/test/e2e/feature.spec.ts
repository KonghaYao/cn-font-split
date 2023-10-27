import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');
import P from 'pngjs';
import pixelmatch from 'pixelmatch';
import { comparePictureBuffer } from './comparePictureBuffer';
const PNG = P.PNG;

for (const iterator of features) {
    test('feature 测试 ' + iterator.featureKey, async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        const item2 = await page
            .locator('.' + iterator.featureKey + '-demo')
            .screenshot();
        const item1 = await page
            .locator('.' + iterator.featureKey)
            .screenshot();
        const { pixelDiffCount, diff } = comparePictureBuffer(item1, item2, {
            threshold: 0.4,
        });
        fs.writeFileSync(
            './temp/' + iterator.featureKey + '-diff.png',
            PNG.sync.write(diff)
        );
        expect(pixelDiffCount).toBeLessThanOrEqual(40);
    });
}
