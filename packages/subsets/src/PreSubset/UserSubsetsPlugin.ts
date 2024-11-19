import { IContext } from '../createContext';
import { subsetsToSet } from '../utils/subsetsToSet';
import { differenceSet } from '../utils/CharSetTool';
import { PreSubsetPlugin, SubsetSetCollection } from '../PreSubset';

export class UserSubsetsPlugin implements PreSubsetPlugin {
    name = 'UserSubsets';
    async subset(
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        const { input } = ctx.pick('input');
        // 获取用户定义的子集，默认为空数组
        const UserSubsets = input.subsets ?? []; // 1
        const userDefinedSet = subsetsToSet(UserSubsets);
        // 创建一个排序后的总字符集合
        // 从总字符集中移除用户定义的子集
        differenceSet(remainingCharsSet, userDefinedSet); //3

        // 创建一个包含用户定义子集的集合
        return [...subsets, userDefinedSet] as SubsetSetCollection;
    }
}
