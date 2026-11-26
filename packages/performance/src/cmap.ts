/**
 * 把 reporter 的 subsetDetail 压平成「码点 -> 分包」查表。
 *
 * 顺序必须与 CSS 的生效顺序一致：`src/link_subset/output_css.rs` 按
 * `items.iter().rev()` 渲染 `@font-face`，也就是 `items[0]` 最后声明、
 * 在 CSS 级联中胜出。因此同一码点出现在多个分包时，本表保留
 * `subsetDetail[0]`（first-wins），才能与浏览器实际请求到的 woff2 对齐。
 *
 * 没有顶层副作用，便于在 `test/cmap.test.mjs` 里直接单测。
 */
export interface SubsetChars {
    chars: number[];
}

export function buildCMapForCssFromReporter<T extends SubsetChars>(reporter: {
    subsetDetail: T[];
}): Map<number, T> {
    const map = new Map<number, T>();
    reporter.subsetDetail.forEach((subset) => {
        subset.chars.forEach((unicode) => {
            // first-wins：先出现的分包即 CSS 中最后声明的分包，后续不再覆盖。
            if (!map.has(unicode)) map.set(unicode, subset);
        });
    });
    return map;
}
