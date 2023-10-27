import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');
import P from 'pngjs';
import pixelmatch from 'pixelmatch';
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
        const img1 = PNG.sync.read(item1);
        const img2 = PNG.sync.read(item2);
        const { width, height } = img1;

        expect(img1.width).toEqual(img2.width);
        expect(img1.height).toEqual(img2.height);
        const diff = new PNG({ width, height });

        const px = pixelmatch(img1.data, img2.data, diff.data, width, height, {
            includeAA: true,
            threshold: 2,
        });
        fs.writeFileSync(
            './temp/' + iterator.featureKey + '-diff.png',
            PNG.sync.write(diff)
        );
        expect(px).toBeLessThanOrEqual(10);
    });
}
