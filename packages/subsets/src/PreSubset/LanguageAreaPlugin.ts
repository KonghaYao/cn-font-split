import { IContext } from '../createContext';
import { PreSubsetPlugin, SubsetSetCollection } from '../PreSubset';
import { defaultArea } from '../data/defaultArea';

export class LanguageAreaPlugin implements PreSubsetPlugin {
    name = 'LanguageArea';
    async subset(
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        const { input } = ctx.pick('input');

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
