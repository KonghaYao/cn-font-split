import { type Font } from '@konghayao/opentype.js';
import { type CharsetReporter } from './CharsetLoader.js';

export type UnicodeCharset = {
    start: number;
    name: string;
    end: number;
    cn: string;
}[];

/** 字符集判断 */
export const UnicodeMatch = (
    font: Font,
    items: Set<number>,
    Unicode: UnicodeCharset
): CharsetReporter[] => {
    return Unicode.map((i) => {
        let support_count = 0;
        const area_count = i.end - i.start + 1;
        for (let index = i.start; index <= i.end; index++) {
            if (items.has(index)) support_count++;
        }
        return {
            ...i,
            support_count,
            area_count,
            coverage: ((support_count * 100) / area_count).toFixed(2),
            in_set_rate: ((support_count * 100) / items.size).toFixed(2),
        };
    });
};
