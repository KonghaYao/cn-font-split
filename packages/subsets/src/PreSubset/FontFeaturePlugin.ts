import { IContext } from '../createContext';
import { getFeatureData, getFeatureMap } from '../feature/featureMap';
import { forceSubset } from '../feature/forceSubset';
import { PreSubsetPlugin, SubsetSetCollection } from '../PreSubset';

export class FontFeaturePlugin implements PreSubsetPlugin {
    name = 'FontFeaturePlugin';
    async subset(
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) {
        const { fontTool } = ctx.pick('fontTool');
        const featureData = getFeatureData(fontTool);
        const featureMap = getFeatureMap(featureData);
        return forceSubset(subsets, featureMap);
    }
}
