import { expect, test } from 'vitest';
import { getFeatureMap } from '../featureMap';
test('getFeatureMap', () => {
    // 测试 将 多个关系行，合并为元素的合集映射
    const res = getFeatureMap([
        [1, 2, 3],
        [2, 5, 6, 8],
        [33, 11, 22],
        [10, 22, 11, 0],
    ]);
    [1, 2, 3, 5, 6, 8].forEach((i) => {
        expect(res.get(i)).eql(new Set([1, 2, 3, 5, 6, 8]));
    });
    [33, 11, 22].forEach((i) => {
        expect(res.get(i)).eql(new Set([0, 10, 11, 22, 33]));
    });
});
