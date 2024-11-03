import { IContext } from '../createContext';
import {
    Arabic,
    Bengali,
    Cyrillic,
    CyrillicExt,
    Devanagari,
    Greek,
    GreekExt,
    Khmer,
    Latin,
    LatinExt,
    Thai,
    Vietnamese,
} from '../data/LanguageRange';
import { PreSubsetPlugin, SubsetSetCollection } from '../PreSubset';
import {
    HangulJamo,
    HangulSyl,
    HiraganaAndKatakana,
    ZhCommon,
    ZhSC,
    ZhTC,
} from '../data/CJKRange';

export class LanguageAreaPlugin implements PreSubsetPlugin {
    name = 'LanguageArea';
    async subset(
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        const { input } = ctx.pick('input');
        // 默认语言区域，包括多个语言的Unicode字符范围
        const defaultArea = [
            Latin,
            LatinExt,
            Vietnamese,
            Greek,
            GreekExt,
            Cyrillic,
            CyrillicExt,
            // await getCN_SC_Rank(),
            // 中文处理
            ZhCommon,
            ZhSC,
            ZhTC,
            // 日文处理
            HiraganaAndKatakana,

            // 韩文处理
            HangulJamo,
            HangulSyl,
            Bengali,
            Devanagari,
            Arabic,
            Thai,
            Khmer,
        ];
        // 根据输入模板使用指定的语言区域或Unicode字符排名，如果没有指定，则使用默认语言区域
        // 对每个区域内的字符进行过滤，确保它们存在于AllUnicodeSet中，并从集合中移除已使用的字符
        const languageSets = await Promise.all(
            defaultArea.map((i) => {
                return i.loader();
            }),
        );
        const areaSubsets: SubsetSetCollection = languageSets
            .map((rank) =>
                rank.filter((char) => {
                    const isIn = remainingCharsSet.has(char);
                    remainingCharsSet.delete(char);
                    return isIn;
                }),
            )
            .filter((i) => i.length)
            .map((i) => new Set(i));
        return [...subsets, ...areaSubsets];
    }
}
