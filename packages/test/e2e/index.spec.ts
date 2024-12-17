import { test, expect } from '@playwright/test';
import { compareElAndSave, comparePictureBuffer } from './comparePictureBuffer';

test('可变字重测试', async ({ page }) => {
    await page.goto('http://localhost:5173/#/article?type=vf');
    await page.waitForLoadState('networkidle');
    await compareElAndSave(
        page,
        '.vf-base',
        '.vf-demo',
        './temp/SourceHanSerifSC-VF/base-demo.diff.png',
    );
});
const tag = [
    'Smileys and emotions',
    'People',
    'Animals and nature',
    'Food and drink',
    'Travel and places',
    'Activities and events',
    'Objects',
    'Symbols',
    'Flags',
];
for (let iterator of tag) {
    test('表情包字体' + iterator, async ({ page }) => {
        await page.goto(
            'http://localhost:5173/#/article?type=noto-color-emoji&group=' +
                iterator,
        );
        await page.waitForLoadState('load');

        iterator = iterator.replace(/\s/g, '-');
        await compareElAndSave(
            page,
            `#${iterator}-base`,
            `#${iterator}-demo`,
            `./temp/NotoColorEmoji/${iterator}.diff.png`,
        );
    });
}
