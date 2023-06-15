import { subsetsToSet } from "../utils/subsetsToSet";
import { loadData } from "../adapter/loadData";
//https://unicode.org/charts/nameslist/

/**
 * Latin、Latin-ext 范围替换
 * https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@1,200&display=swap
 * */
export const Latin = [
    ...subsetsToSet([
        [
            [0x0000, 0x00ff],
            0x0131,
            [0x0152, 0x0153],
            [0x02bb, 0x02bc],
            0x02c6,
            0x02da,
            0x02dc,
            0x0304,
            0x0308,
            0x0329,
            [0x2000, 0x206f],
            0x2074,
            0x20ac,
            0x2122,
            0x2191,
            0x2193,
            0x2212,
            0x2215,
            0xfeff,
            0xfffd,
        ],
        [
            [0x0100, 0x02af],
            0x0304,
            0x0308,
            0x0329,
            [0x1e00, 0x1e9f],
            [0x1ef2, 0x1eff],
            0x2020,
            [0x20a0, 0x20ab],
            [0x20ad, 0x20cf],
            0x2113,
            [0x2c60, 0x2c7f],
            [0xa720, 0xa7ff],
        ],
    ]),
];
/** 获取中文字符序列信息 */
export const getCN_SC_Rank = async () => [
    ...new Uint16Array((await loadData("cn_char_rank.dat")).buffer),
];
