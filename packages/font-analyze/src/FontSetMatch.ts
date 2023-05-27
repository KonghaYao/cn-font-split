import { FontEditor, TTF } from "fonteditor-core";
import { CharsetReporter } from "./index";

export type Charset = ([number, number] | [number])[];
export const calcCharset = (charset: Charset) => {
    return charset.reduce((col, cur) => {
        if (cur.length === 1) {
            return col + 1;
        } else {
            return col + 1 + cur[1] - cur[0];
        }
    }, 0);
};

/** 字符集判断 */
export const FontSetMatch = (
    font: FontEditor.Font,
    meta: TTF.TTFObject,
    charset: Charset,
    name: string
): CharsetReporter => {
    const items = new Set(Object.keys(meta.cmap).map((i) => parseInt(i)));
    let support_count = 0;
    let area_count = 0;
    for (const area of charset) {
        const [min, max] = area.length === 2 ? area : [area[0], area[0]];
        for (let index = min; index <= max; index++) {
            if (items.has(index)) {
                support_count++;
            }
            area_count++;
        }
    }
    return {
        name,
        support_count,
        area_count,
        coverage: ((support_count * 100) / area_count).toFixed(2),
        in_set_rate: ((support_count * 100) / items.size).toFixed(2),
    };
};
