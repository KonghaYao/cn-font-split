import { expect, test } from 'vitest';
import { ZhCommon, ZhSC, ZhTC } from '../CJKRange';
import { Assets } from '../../adapter/assets';
Assets.set('cn_char_rank.dat', './data/cn_char_rank.dat');
test('测试中文数据包的准确性', async () => {
    const data = await Promise.all(
        [ZhCommon, ZhSC, ZhTC].map((i) => i.loader()),
    );
    expect(data.map((i) => i.length)).toEqual([4329, 2508, 2481]);
});
