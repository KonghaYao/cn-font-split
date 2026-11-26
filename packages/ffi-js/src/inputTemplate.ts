import type { FontSplitProps, OriginInput } from './interface.js';

/**
 * JS 配置 → InputTemplate 的 init。
 *
 * 这里是唯一允许进入 wire 的字段白名单（= index.proto 的 InputTemplate 字段）：
 * `outputFile`/`silent` 等 JS 侧选项不属于 proto，不能靠对象展开混进去。
 * 未设置的字段留 `undefined`，`create()` 会跳过它们（不产生 optional 存在性）。
 */
export const toInputTemplateInit = (
    props: Omit<FontSplitProps, 'input'> & { input: Uint8Array },
): OriginInput => {
    return {
        input: props.input,
        subsets: props.subsets?.map(
            (i) => new Uint8Array(new Uint32Array(i).buffer),
        ),
        outDir: props.outDir,
        css: props.css,
        targetType: props.targetType,
        chunkSize: props.chunkSize,
        chunkSizeTolerance: props.chunkSizeTolerance,
        maxAllowSubsetsCount: props.maxAllowSubsetsCount,
        testHtml: props.testHtml,
        reporter: props.reporter,
        previewImage: props.previewImage,
        renameOutputFont: props.renameOutputFont,
        buildMode: props.buildMode,
        languageAreas: props.languageAreas,
        multiThreads: props.multiThreads,
        fontFeature: props.fontFeature,
        reduceMins: props.reduceMins,
        autoSubset: props.autoSubset,
        subsetRemainChars: props.subsetRemainChars,
    };
};
