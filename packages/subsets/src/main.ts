import { convert } from './convert/font-converter';
import { hbjs } from './hb';
import { Executor } from './pipeline/index';
import { loadHarbuzzAdapter } from './adapter/loadHarfbuzz';
import { createContext } from './fontSplit/context';
import path from 'path';
import byteSize from 'byte-size';
import { InputTemplate } from './interface';
import { BundleReporter, createReporter } from './templates/reporter';
import { createCSS } from './templates/css';
import { subsetsToSet } from './utils/subsetsToSet';
import { useSubset, getAutoSubset } from './useSubset/index';
import { Latin, getCN_SC_Rank } from './data/Ranks';
import { Assets } from './adapter/assets';
import { env } from './utils/env';
import { ConvertManager } from './convert/convert.manager';
import { makeImage } from './makeImage/index';
import { getFeatureData, getFeatureMap } from './subsetService/featureMap';
import { forceSubset } from './subsetService/forceSubset';
import { calcContoursBorder } from './useSubset/calcContoursBorder';
import { createContoursMap } from './useSubset/createContoursMap';
import { reduceMinsPackage } from './useSubset/reduceMinsPackage';
import {
    createFontBaseTool,
    getNameTableFromTool,
} from './subsetService/getFeatureQueryFromBuffer';
export { type FontReporter } from './templates/reporter';
import { CharsetTool } from './utils/CharSetTool';

export const fontSplit = async (opt: InputTemplate) => {
    const outputFile = opt.outputFile ?? Assets.outputFile;
    const exec = new Executor(
        [
            /** 从路径或者二进制数据获取原始字体文件 */
            async function LoadFile(ctx) {
                ctx.info(
                    `cn-font-split@${__cn_font_split_version__} 环境检测\t`,
                    env,
                );
                typeof opt.log === 'function' && ctx.recordLog(opt.log);
                const { input } = ctx.pick('input');
                let res!: Uint8Array;

                if (typeof input.FontPath === 'string') {
                    res = await Assets.loadFileAsync(input.FontPath);
                } else if (input.FontPath instanceof Uint8Array) {
                    // 视为二进制数据
                    res = new Uint8Array(input.FontPath);
                }
                ctx.trace('输入文件大小：' + byteSize(res.byteLength));
                ctx.set('bundleMessage', { originLength: res.byteLength });
                ctx.set('originFile', res);
            },

            /** 转换为 TTF 格式，这样可以被 HarfBuzz 操作 */
            async function transferFontType(ctx) {
                const { originFile, bundleMessage } = ctx.pick(
                    'input',
                    'originFile',
                    'bundleMessage',
                );
                const ttfFile = await convert(originFile, 'truetype');
                bundleMessage.ttfLength = ttfFile.byteLength;
                ctx.set('ttfBufferSize', ttfFile.byteLength);
                ctx.set('ttfFile', ttfFile);
                ctx.free('originFile');
            },

            /** 加载 Harfbuzz 字体操作库 */
            async function loadHarbuzz(ctx) {
                const { ttfFile } = ctx.pick('input', 'ttfFile');

                const wasm = await loadHarbuzzAdapter();
                if (!wasm) throw new Error('启动 harfbuzz 失败');
                const hb = hbjs(wasm.instance);
                const blob = hb.createBlob(ttfFile);
                const face = hb.createFace(blob, 0);
                blob.destroy();
                ctx.set('hb', hb);
                ctx.set('face', face);
                ctx.set('blob', blob);
                if (opt.threads !== false) {
                    opt.threads = opt.threads || {};
                    opt.threads.service = new ConvertManager(
                        opt.threads.options,
                    );
                }
            },
            async function initOpentype(ctx) {
                const { ttfFile } = ctx.pick('input', 'ttfFile');
                const fontTool = createFontBaseTool(ttfFile.buffer);
                ctx.set('fontTool', fontTool);
                ctx.free('ttfFile');
            },
            async function createImage(ctx) {
                const { input, hb, face } = ctx.pick('input', 'hb', 'face');
                if (input.previewImage) {
                    const font = hb.createFont(face);
                    const encoded = await makeImage(
                        hb,
                        font,
                        input.previewImage?.text,
                    );
                    font.destroy();
                    await outputFile(
                        path.join(input.destFold, 'preview' + '.svg'),
                        encoded,
                    );
                }
            },

            /** 获取字体的基础信息，如字体族类，license等 */
            async function getBasicMessage(ctx) {
                const { fontTool } = ctx.pick('fontTool', 'face');
                const nameTable = getNameTableFromTool(fontTool);
                ctx.set('nameTable', nameTable);
            },
            /** 通过数据计算得出分包的数据结构 */
            async function PreSubset(ctx) {
                const {
                    input,
                    hb,
                    face,
                    ttfBufferSize,
                    bundleMessage,
                    fontTool,
                } = ctx.pick(
                    'input',
                    'face',
                    'hb',
                    'ttfBufferSize',
                    'bundleMessage',
                    'fontTool',
                );
                const UserSubsets = opt.subsets ?? []; // 1
                const totalChars = face.collectUnicodes();
                ctx.trace('总字符数', totalChars.length);
                bundleMessage.originSize = totalChars.length;
                const AllUnicodeSet = new Set([...totalChars]); // 2
                CharsetTool.difference(
                    AllUnicodeSet,
                    subsetsToSet(UserSubsets),
                ); //3
                /**  默认语言强制分包，保证 Latin1 这种数据集中在一个包，这样只有英文，无中文区域 */
                const autoForceBundle: number[][] = (
                    opt.unicodeRank ?? [Latin, await getCN_SC_Rank()]
                ).map((rank) =>
                    rank.filter((char) => {
                        const isIn = AllUnicodeSet.has(char);
                        AllUnicodeSet.delete(char);
                        return isIn;
                    }),
                ); // 4
                const featureData = getFeatureData(fontTool);
                const featureMap = getFeatureMap(featureData);
                const ForcePartSubsets = forceSubset(UserSubsets, featureMap); // 5
                CharsetTool.difference(AllUnicodeSet, ForcePartSubsets.flat()); // 6

                autoForceBundle.push([...AllUnicodeSet]);
                const contoursMap = await createContoursMap();
                /** 单包最大轮廓数值 */
                const contoursBorder = await calcContoursBorder(
                    hb,
                    face,
                    input.targetType ?? 'woff2',
                    contoursMap,
                    input.chunkSize ?? 70 * 1024,
                    new Set([...totalChars]),
                );

                const AutoPartSubsets: number[][] = [];
                /** 计算合理的单个分包的理论字符上限，尽量保证不会出现超大分包 */
                const maxCharSize =
                    ((opt.chunkSizeTolerance ?? 1.7) *
                        totalChars.length *
                        (input.chunkSize ?? 70 * 1024)) /
                    ttfBufferSize; // 8

                for (const bundle of autoForceBundle) {
                    const subset = getAutoSubset(
                        bundle,
                        contoursBorder,
                        contoursMap,
                        featureMap,
                        maxCharSize,
                    );
                    AutoPartSubsets.push(...subset);
                } // 9
                // 检查 featureMap 中未使用的数据
                for (const [key, iterator] of featureMap.entries()) {
                    if (iterator)
                        ctx.warn(
                            'featureMap ' + key + ' 未使用' + iterator.size,
                        );
                }

                const FullSubsets =
                    input.autoChunk !== false
                        ? [...ForcePartSubsets, ...AutoPartSubsets]
                        : ForcePartSubsets;

                const totalSubsets = reduceMinsPackage(FullSubsets, ctx); // 10

                const subsetCharsNumber = totalSubsets.reduce((col, cur) => {
                    col += cur.length;
                    return col;
                }, 0);
                if (
                    input.autoChunk !== false &&
                    subsetCharsNumber < totalChars.length
                ) {
                    console.log(
                        '字符缺漏',
                        subsetCharsNumber,
                        totalChars.length,
                    );
                } // 11

                if (totalSubsets.length >= (input.maxAllowSubsetsCount ?? 600))
                    throw new Error(
                        '分包数为' +
                            totalSubsets.length +
                            '，超过了期望最大分包数，将会导致您的机器过久运行',
                    );
                ctx.set('subsetsToRun', totalSubsets);
                ctx.free('ttfFile');
            },
            /** 执行所有包的分包动作 */
            async function subsetFont(ctx) {
                const { input, face, blob, subsetsToRun, hb, bundleMessage } =
                    ctx.pick(
                        'input',
                        'face',
                        'blob',
                        'hb',
                        'subsetsToRun',
                        'bundleMessage',
                    );

                const Result = await useSubset(
                    face,
                    hb,
                    subsetsToRun,
                    async (filename, buffer) => {
                        return outputFile(
                            path.join(input.destFold, filename),
                            buffer,
                        );
                    },
                    input.targetType ?? 'woff2',
                    ctx,
                );

                bundleMessage.bundledSize = Result.reduce(
                    (col, cur) => col + cur.charLength,
                    0,
                );
                bundleMessage.bundledTotalLength = Result.reduce(
                    (col, cur) => col + cur.size,
                    0,
                );
                ctx.set('subsetResult', Result);
                face.destroy();
                blob.free();
                ctx.free('blob', 'face', 'hb');
            },
            /** 输出 css 文件 */
            async function outputCSS(ctx) {
                const { nameTable, subsetResult, input } = ctx.pick(
                    'input',
                    'nameTable',
                    'subsetResult',
                );
                const css = createCSS(subsetResult, nameTable, input.css);
                await outputFile(
                    path.join(
                        input.destFold,
                        input.cssFileName ?? 'result.css',
                    ),
                    css,
                );
            },
            async function outputHTML(ctx) {
                const { input } = ctx.pick('input');
                if (input.testHTML !== false) {
                    const { createTestHTML } = await import(
                        './templates/html/index'
                    );
                    const reporter = createTestHTML();
                    await outputFile(
                        path.join(input.destFold, 'index.html'),
                        await reporter,
                    );
                }
            },
            async function outputReporter(ctx) {
                const { nameTable, subsetResult, input, bundleMessage } =
                    ctx.pick(
                        'input',
                        'nameTable',
                        'subsetResult',
                        'bundleMessage',
                    );
                if (!(input.testHTML === false && input.reporter === false)) {
                    const reporter = await createReporter(
                        subsetResult,
                        nameTable,
                        input,
                        exec.records,
                        bundleMessage as BundleReporter,
                    );
                    await outputFile(
                        path.join(input.destFold, 'reporter.json'),
                        JSON.stringify(reporter),
                    );
                }
            },
            async function Clear(ctx) {
                const { input } = ctx.pick('input');
                input.threads && input.threads?.service?.destroy();
            },
        ],
        createContext(opt),
    );
    const ctx = await exec.run();
};
