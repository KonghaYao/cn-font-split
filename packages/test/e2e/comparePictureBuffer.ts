import P from 'pngjs';
import pixelmatch from 'pixelmatch';
import { Page, expect } from '@playwright/test';
const PNG = P.PNG;
export const comparePictureBuffer = (
    pic1: Buffer,
    pic2: Buffer,
    config = {},
) => {
    const img1 = PNG.sync.read(pic1);
    const img2 = PNG.sync.read(pic2);
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);

    expect(img1.width).toEqual(img2.width);
    expect(img1.height).toEqual(img2.height);
    const diff = new PNG({ width, height });

    const pixelDiffCount = pixelmatch(
        img1.data,
        img2.data,
        diff.data,
        width,
        height,
        {
            threshold: 0.1,
            ...config,
        },
    );
    return { pixelDiffCount, diff };
};
import fs from 'fs-extra';
export const compareElAndSave = async (
    page: Page,
    el1: string,
    el2: string,
    savePath: string,
) => {
    const item2 = await page.locator(el1).screenshot();
    const item1 = await page.locator(el2).screenshot();
    const { pixelDiffCount, diff } = comparePictureBuffer(item1, item2, {
        threshold: 0.3,
    });
    fs.writeFileSync(savePath, PNG.sync.write(diff));
    expect(pixelDiffCount).toBeLessThanOrEqual(100);
};
