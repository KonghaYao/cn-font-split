import { test, expect } from '@playwright/test';
import fs from 'fs-extra';
const features = fs.readJSONSync('./FeatureConfig.json');
import { compareElAndSave, comparePictureBuffer } from './comparePictureBuffer';
import P from 'pngjs';
const PNG = P.PNG;

for (const iterator of features) {
    test('feature 测试 ' + iterator.featureKey, async ({ page }) => {
        await page.goto(
            'http://localhost:5173/#/feature?wasm=true&feature=' +
                iterator.featureKey,
        );
        await page.waitForLoadState('networkidle');
        await compareElAndSave(
            page,
            '.' + iterator.featureKey + '-hb-wasm',
            '.' + iterator.featureKey,
            './temp/' +
                iterator.featureKey +
                '/' +
                iterator.featureKey +
                '-diff.wasm.png',
        );
    });
}
