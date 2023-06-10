import { Subsets } from "src/interface";

/** 从 CSS 文件中获取字体 subsets 类型的数据 */
export const getSubsetsFromCSS = (css: string): Subsets => {
    return css.match(/@font-face[\s\S]+?\}/g)!.map((face) => {
        const range = face.match(/unicode-range:(.*(?:[,;]))+/)![1];
        return range
            .split(/[,;]/)
            .map((i) => i.trim())
            .filter(Boolean)
            .map((i) => {
                i = i.replace("U+", "");
                if (i.includes("-")) {
                    return i.split("-").map((i) => parseInt("0x" + i)) as [
                        number,
                        number
                    ];
                } else {
                    return parseInt("0x" + i);
                }
            });
    });
};
