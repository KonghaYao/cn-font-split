import { expect, test } from 'vitest';
import { Context } from '../context';

test('Context 初始化参数及设置参数', async () => {
    /* ... */
    const ctx = new Context<{ a: number; b: string }>({ b: 'test' });
    ctx.set('a', 283923892);
    expect(ctx.pick('a').a).toBe(283923892);

    expect(ctx.pick('b').b).toBe('test');

    ctx.free('a');

    expect(ctx.check('a')).toBe(false);
    ctx.destroy();
});
