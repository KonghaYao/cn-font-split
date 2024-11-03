import { IContext } from '../createContext';
import { PreSubsetPlugin, SubsetSetCollection } from '../PreSubset';

/** 将剩余字符加入分包 */
export class AddRemainCharsPlugin implements PreSubsetPlugin {
    name = 'AddRemainChars';
    async subset(
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        // 将剩余的字符添加到子集中
        subsets.push(remainingCharsSet);
        return subsets;
    }
}
