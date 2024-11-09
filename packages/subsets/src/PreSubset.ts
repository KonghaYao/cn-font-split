import { IContext } from './createContext';
import { ReduceMinsPlugin } from './PreSubset/ReduceMinsPlugin';
import { AutoFlatPlugin as AutoSubsetPlugin } from './PreSubset/AutoFlatPlugin/AutoFlatPlugin';
import { AddRemainCharsPlugin } from './PreSubset/AddRemainCharsPlugin';
import { LanguageAreaPlugin } from './PreSubset/LanguageAreaPlugin';
import { UserSubsetsPlugin } from './PreSubset/UserSubsetsPlugin';
import { SubsetsCheckPlugin } from './PreSubset/SubsetsCheckPlugin';
import { FontFeaturePlugin } from './PreSubset/FontFeaturePlugin';

export type SubsetSetCollection = Set<number>[];
export interface PreSubsetPlugin {
    name: string;
    enforce?: 'pre' | 'post';
    subset: (
        subsets: SubsetSetCollection,
        ctx: IContext,
        remainingCharsSet: Set<number>,
    ) => Promise<SubsetSetCollection>;
    afterCheck?: (ctx: IContext) => void;
}

/**
 * 异步函数 PreSubset 用于处理字体的预子集化过程
 * 它根据输入的字体文件和配置，生成一个优化的字符子集列表，用于后续的字体处理
 * @param ctx IContext 类型的上下文对象，包含了处理所需的各种输入和工具
 */
export async function PreSubset(ctx: IContext) {
    const { face, bundleMessage, input } = ctx.pick(
        'input',
        'face',
        'bundleMessage',
    );
    // 收集字体中所有的Unicode字符
    const totalChars = face.collectUnicodes();
    ctx.set('totalChars', totalChars);
    ctx.trace('总字符数', totalChars.length);
    bundleMessage.originSize = totalChars.length;

    /** 未分包字符集合 */
    const remainingCharsSet = new Set([...totalChars].sort()); // 2

    let resultSubsets: SubsetSetCollection = [];

    // 处理用户输入的插件
    const userPlugin = input.plugins || [];
    const [prePlugins, postPlugins] = userPlugin.reduce(
        (col, cur) => {
            if (cur.enforce === 'pre') col[0].push(cur);
            else col[1].push(cur);
            return col;
        },
        [[], []] as PreSubsetPlugin[][],
    );

    const plugins: PreSubsetPlugin[] = (
        [
            ...prePlugins,
            // 数据收集插件
            new UserSubsetsPlugin(),
            input.languageAreas !== false && new LanguageAreaPlugin(),
            input.subsetRemainChars !== false && new AddRemainCharsPlugin(),
            // 修饰插件，不会大幅增加字符
            input.autoSubset !== false && new AutoSubsetPlugin(),
            input.fontFeature !== false && new FontFeaturePlugin(),
            input.reduceMins && new ReduceMinsPlugin(),

            // 日志、统计插件
            new SubsetsCheckPlugin(),
            ...postPlugins,
        ] as PreSubsetPlugin[]
    ).filter(Boolean);
    for (const plugin of plugins) {
        resultSubsets = await plugin.subset(
            resultSubsets,
            ctx,
            remainingCharsSet,
        );
    }
    for (const plugin of plugins) {
        plugin.afterCheck?.(ctx);
    }

    // 设置最终的子集列表到上下文中
    ctx.set(
        'subsetsToRun',
        resultSubsets.map((i) => [...i]),
    );
    // 释放不再需要的 ttf 文件资源
    ctx.free('ttfFile', 'totalChars');
}
