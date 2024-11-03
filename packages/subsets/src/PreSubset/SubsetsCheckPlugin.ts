import { IContext } from '../createContext';
import { PreSubsetPlugin, SubsetSetCollection } from '../PreSubset';

export class SubsetsCheckPlugin implements PreSubsetPlugin {
    name = 'SubsetsCheckPlugin';
    async subset(
        resultSubsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        const { input, totalChars } = ctx.pick('input', 'totalChars');
        // 合并所有子集并优化
        // const totalSubsets = reduceMinsPackage(FullSubsets, ctx); // 10
        // 计算所有子集的总字符数
        const subsetCharsNumber = resultSubsets.reduce((col, cur) => {
            return col + cur.size;
        }, 0);
        // 如果使用了自动分包但字符数有缺漏，则记录警告
        if (
            input.autoSubset !== false &&
            subsetCharsNumber < totalChars.length
        ) {
            ctx.trace('字符缺漏', subsetCharsNumber, totalChars.length);
        } // 11

        // 如果分包数超过最大允许值，则抛出错误
        if (resultSubsets.length >= (input.maxAllowSubsetsCount ?? 600))
            throw new Error(
                '分包数为' +
                    resultSubsets.length +
                    '，超过了期望最大分包数，将会导致您的机器过久运行',
            );
        return resultSubsets;
    }
}
