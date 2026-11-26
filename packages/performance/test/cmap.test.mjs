// buildCMapForCssFromReporter 的单元测试。
//
// 关注点：同一码点出现在两个分包时的归属。CSS 按 `items.iter().rev()` 输出，
// items[0] 最后声明、在级联中胜出，所以查表必须是 first-wins。
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCMapForCssFromReporter } from '../src/cmap.ts';

test('同一码点出现在两个 subset 时取 subsetDetail[0]', () => {
    const first = { file_name: 'first.woff2', chars: [0x41, 0x42], bytes: 100 };
    const second = {
        file_name: 'second.woff2',
        chars: [0x42, 0x43],
        bytes: 200,
    };

    const map = buildCMapForCssFromReporter({
        subsetDetail: [first, second],
    });

    // 0x42 两边都有：CSS 中 first 是最后声明的 @font-face，因此取 first。
    assert.equal(map.get(0x42), first);
    assert.equal(map.get(0x41), first);
    assert.equal(map.get(0x43), second);
    assert.equal(map.size, 3);
});

test('重叠码点不依赖 subsetDetail 的写入次数（后写不覆盖）', () => {
    const a = { chars: [0x4e00] };
    const b = { chars: [0x4e00] };
    const c = { chars: [0x4e00] };

    const map = buildCMapForCssFromReporter({ subsetDetail: [a, b, c] });

    assert.equal(map.size, 1);
    assert.equal(map.get(0x4e00), a);
});

test('空 reporter 返回空表', () => {
    const map = buildCMapForCssFromReporter({ subsetDetail: [] });
    assert.equal(map.size, 0);
});
