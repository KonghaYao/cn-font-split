import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');
import { compareElAndSave, comparePictureBuffer } from './comparePictureBuffer';
import P from 'pngjs';
const PNG = P.PNG;

for (const iterator of features) {
    test('feature 测试 ' + iterator.featureKey, async ({ page }) => {
        await page.goto('http://localhost:5173/');
        await page.waitForLoadState('networkidle');
        // 测试 harfbuzz 版本只需要将 -demo 替换为 -hb 即可
        // 测试 harfbuzz wasm 版本只需要将 -demo 替换为 -hb-wasm 即可
        await compareElAndSave(
            page,
            '.' + iterator.featureKey + '-demo',
            // '.' + iterator.featureKey + '-hb',
            // '.' + iterator.featureKey + '-hb-wasm',
            '.' + iterator.featureKey,
            './temp/' +
                iterator.featureKey +
                '/' +
                iterator.featureKey +
                '-diff.png',
        );
    });
}
