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
import { getUnForcedCodes } from './useSubset/getUnForcedCodes';
import { reduceMinsPackage } from './useSubset/reduceMinsPackage';
export { type FontReporter } from './templates/reporter';

export const fontSplit = async (opt: InputTemplate) => {
    const outputFile = opt.outputFile ?? Assets.outputFile;
    const exec = new Executor(
        [
            /** 从路径或者二进制数据获取原始字体文件 */
            async function LoadFile(ctx) {
                ctx.info('cn-font-split 环境检测\t', env);
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
                    'bundleMessage'
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
                        opt.threads.options
                    );
                }
            },
            async function initOpentype(ctx) {
                const { ttfFile } = ctx.pick('input', 'ttfFile');
                // rollup 认为 opentype.js 是一个 js 文件，所以会找不到路径
                const { parse } = await import(
                    '@konghayao/opentype.js/dist/opentype.module.js'
                );
                const font = parse(ttfFile.buffer);
                ctx.set('opentype_font', font);
                ctx.free('ttfFile');
            },
            async function createImage(ctx) {
                const { input, opentype_font } = ctx.pick(
                    'input',
                    'opentype_font'
                );
                if (input.previewImage) {
                    const encoded = await makeImage(
                        opentype_font,
                        input.previewImage?.text
                    );
                    await outputFile(
                        path.join(input.destFold, 'preview' + '.svg'),
                        encoded
                    );
                }
            },

            /** 获取字体的基础信息，如字体族类，license等 */
            async function getBasicMessage(ctx) {
                const { opentype_font } = ctx.pick('opentype_font');
                const nameTable = opentype_font.tables['name'];
                // console.table(nameTable);
                ctx.set('nameTable', nameTable);
            },
            /** 通过数据计算得出分包的数据结构 */
            async function PreSubset(ctx) {
                const {
                    input,
                    hb,
                    face,
                    opentype_font,
                    ttfBufferSize,
                    bundleMessage,
                } = ctx.pick(
                    'input',
                    'face',
                    'hb',
                    'blob',
                    'opentype_font',
                    'ttfBufferSize',
                    'bundleMessage'
                );

                /** 根据 subsets 参数进行优先分包 */
                const subsets = opt.subsets ?? [];
                const featureData = getFeatureData(opentype_font);
                const featureMap = getFeatureMap(featureData);
                const forcePart = forceSubset(subsets, featureMap);

                const totalChars = face.collectUnicodes();
                ctx.trace('总字符数', totalChars.length);
                bundleMessage.originSize = totalChars.length;

                /** 已经在 forcePart 中分包的 unicode */
                const forcePartSet = subsetsToSet(forcePart);

                const codes = getUnForcedCodes(totalChars, forcePartSet);

                const charsSet = new Set([...totalChars]);
                /** 自动分包内部的强制分包机制，保证 Latin1 这种数据集中在一个包，这样只有英文，无中文区域 */
                const unicodeForceBundle: number[][] =
                    opt.unicodeRank ??
                    [Latin, await getCN_SC_Rank()].map((i) =>
                        i.filter((ii) => charsSet.has(ii))
                    );
                const forceBundleSet = new Set([...unicodeForceBundle.flat()]);
                unicodeForceBundle.push(
                    codes.filter((i) => !forceBundleSet.has(i))
                );

                const contoursMap = await createContoursMap();
                /** 单包最大轮廓数值 */
                const contoursBorder = await calcContoursBorder(
                    hb,
                    face,
                    input.targetType ?? 'woff2',
                    contoursMap,
                    input.chunkSize ?? 70 * 1024,
                    charsSet
                );

                const autoPart: number[][] = [];
                /** 计算合理的单个分包的理论字符上限，尽量保证不会出现超大分包 */
                const maxCharSize =
                    ((opt.chunkSizeTolerance ?? 1.7) *
                        totalChars.length *
                        (input.chunkSize ?? 70 * 1024)) /
                    ttfBufferSize;

                for (const bundle of unicodeForceBundle) {
                    const subset = getAutoSubset(
                        bundle,
                        contoursBorder,
                        contoursMap,
                        featureMap,
                        maxCharSize
                    );
                    autoPart.push(...subset);
                }
                // 检查 featureMap 中未使用的数据
                for (const [key, iterator] of featureMap.entries()) {
                    if (iterator)
                        ctx.warn(
                            'featureMap ' + key + ' 未使用' + iterator.size
                        );
                }

                const fullSubsets = [...forcePart, ...autoPart];

                const totalSubsets = reduceMinsPackage(fullSubsets, ctx);

                const subsetCharsNumber = totalSubsets.reduce((col, cur) => {
                    col += cur.length;
                    return col;
                }, 0);
                if (subsetCharsNumber < totalChars.length) {
                    console.log(
                        '字符缺漏',
                        subsetCharsNumber,
                        totalChars.length
                    );
                }
                if (totalSubsets.length >= (input.maxAllowSubsetsCount ?? 600))
                    throw new Error(
                        '分包数为' +
                            totalSubsets.length +
                            '，超过了期望最大分包数，将会导致您的机器过久运行'
                    );
                ctx.set('subsetsToRun', totalSubsets);
                ctx.free('opentype_font');
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
                        'bundleMessage'
                    );

                const Result = await useSubset(
                    face,
                    hb,
                    subsetsToRun,
                    async (filename, buffer) => {
                        return outputFile(
                            path.join(input.destFold, filename),
                            buffer
                        );
                    },
                    input.targetType ?? 'woff2',
                    ctx
                );

                bundleMessage.bundledSize = Result.reduce(
                    (col, cur) => col + cur.charLength,
                    0
                );
                bundleMessage.bundledTotalLength = Result.reduce(
                    (col, cur) => col + cur.size,
                    0
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
                    'subsetResult'
                );
                const css = createCSS(subsetResult, nameTable, input.css);
                await outputFile(
                    path.join(
                        input.destFold,
                        input.cssFileName ?? 'result.css'
                    ),
                    css
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
                        await reporter
                    );
                }
            },
            async function outputReporter(ctx) {
                const { nameTable, subsetResult, input, bundleMessage } =
                    ctx.pick(
                        'input',
                        'nameTable',
                        'subsetResult',
                        'bundleMessage'
                    );
                if (!(input.testHTML === false && input.reporter === false)) {
                    const reporter = await createReporter(
                        subsetResult,
                        nameTable,
                        input,
                        exec.records,
                        bundleMessage as BundleReporter
                    );
                    await outputFile(
                        path.join(input.destFold, 'reporter.json'),
                        JSON.stringify(reporter)
                    );
                }
            },
            async function Clear(ctx) {
                const { input } = ctx.pick('input');
                input.threads && input.threads?.service?.destroy();
            },
        ],
        createContext(opt)
    );
    const ctx = await exec.run();
};
