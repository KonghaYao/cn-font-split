import { Assets } from '../adapter/assets';
import { LanguageArea } from './LanguageRange';
async function getPartFromCNPkg(partNo: number) {
    const binary = await Assets.loadFileAsync('cn_char_rank.dat');
    const data = new Uint16Array(binary.buffer);
    let lastIndex = 0;
    for (let i = 0; i < data.length; i++) {
        const element = data[i];
        if (element === 0) {
            partNo--;
            if (partNo < 0) return [...data.subarray(lastIndex, i)];
            lastIndex = i + 1;
        }
    }
    if (partNo === 0) return [...data.subarray(lastIndex)];
    throw new Error('Invalid partNo');
}

/** 获取中文字符序列信息 */
export const ZhCommon: LanguageArea = {
    name: 'CN_SC_Rank',
    loader: async () => getPartFromCNPkg(0),
};

export const ZhSC: LanguageArea = {
    name: 'ZhSC',
    loader: async () => getPartFromCNPkg(1),
};
export const ZhTC: LanguageArea = {
    name: 'ZhTC',
    loader: async () => getPartFromCNPkg(2),
};
