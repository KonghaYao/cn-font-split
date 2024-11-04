import { test } from 'vitest';
import { defaultArea } from '../defaultArea';
import { expect } from 'vitest';
import { Assets } from '../../adapter/assets';
import { UnicodeRange } from '@japont/unicode-range';
Assets.set('cn_char_rank.dat', './data/cn_char_rank.dat');
Assets.set('hangul-syl.dat', './data/hangul-syl.dat');
test('检查默认语言区域相互不覆盖', async () => {
    const config = await Promise.all(
        defaultArea.map(async (i) => {
            return {
                data: new Set(await i.loader()),
                name: i.name,
            };
        }),
    );
    // console.log(
    //     config.map((i) => {
    //         return { name: i.name, num: i.data.size };
    //     }),
    // );
    // 检查 语言区域是否相互不覆盖
    let errors: any[] = [];
    for (let i = 0; i < config.length; i++) {
        for (let j = i + 1; j < config.length; j++) {
            const item1 = config[i];
            const item2 = config[j];
            const intersection = new Set(
                [...item1.data].filter((x) => item2.data.has(x)),
            );
            if (intersection.size)
                errors.push([
                    item1.name,
                    item2.name,
                    UnicodeRange.stringify([...intersection]),
                    intersection.size,
                ]);
        }
    }
    console.log(errors);
    expect(errors.length).toBe(0);
});
