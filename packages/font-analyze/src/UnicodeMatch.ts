import { FontEditor, TTF } from "fonteditor-core";
import Unicode from "../data/unicodes.json";
import { CharsetReporter } from "src";
/** 字符集判断 */
export const UnicodeMatch = (
    font: FontEditor.Font,
    meta: TTF.TTFObject
): CharsetReporter[] => {
    const items = new Set(Object.keys(meta.cmap).map((i) => parseInt(i)));
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
