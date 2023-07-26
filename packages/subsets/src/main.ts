import { convert } from './convert/font-converter';

import { hbjs } from './hb';
import { Executor } from './pipeline/index';
import { loadHarbuzzAdapter } from './adapter/loadHarfbuzz';
import { subsetAll } from './subset';
import { createContext } from './fontSplit/context';
import path from 'path';
import byteSize from 'byte-size';
import { InputTemplate, Subsets } from './interface';
import { createReporter } from './templates/reporter';
import { createCSS } from './templates/css';
import { subsetsToSet } from './utils/subsetsToSet';
import { useSubset, getAutoSubset } from './autoSubset/index';
import { Latin, getCN_SC_Rank } from './ranks/index';
import { Assets } from './adapter/assets';
import { env } from './utils/env';
import { ConvertManager } from './convert/convert.manager';
import { makeImage } from './imagescript/index';
import {
    forceSubset,
    getFeatureData,
    getFeatureMap,
} from './subsetService/featureMap';
import { calcContoursBorder } from './autoSubset/calcContoursBorder';
import { createContoursMap } from './autoSubset/createContoursMap';
// import { SubsetService } from "./subsetService";

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
                ctx.set('originFile', res);
            },

            /** 转换为 TTF 格式，这样可以被 HarfBuzz 操作 */
            async function transferFontType(ctx) {
                const { input, originFile } = ctx.pick('input', 'originFile');

                const ttfFile = await convert(originFile, 'truetype');
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
                if (opt.threads) {
                    opt.threads.service = new ConvertManager(opt.threads.options);
                }
            },
            async function initOpentype(ctx) {
                const { ttfFile, input } = ctx.pick('input', 'ttfFile');
                const font = (await import('opentype.js')).parse(
                    ttfFile.buffer
                );
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
                const { input, hb, face, opentype_font } = ctx.pick(
                    'input',
                    'face',
                    'hb',
                    'blob',
                    'opentype_font'
                );

                /** 根据 subsets 参数进行优先分包 */
                const subsets = opt.subsets ?? [];
                // input.fontFeature !== false && subsets.unshift(...feature_unicodes)
                const featureData = getFeatureData(opentype_font);
                const featureMap = getFeatureMap(featureData);
                // console.log(featureMap.get(65176)) // Set(4) { 65176, 65188, 65182, 64849 }
                const forcePart = forceSubset(subsets, featureMap);

                const totalChars = face.collectUnicodes();
                ctx.trace('总字符数', totalChars.length);

                /** 已近在 forcePart 中分包的 unicode */
                const bundleChars = subsetsToSet(forcePart);

                /** 求出未分包的 unicodes */
                const codes: number[] = [];
                for (let index = 0; index < totalChars.length; index++) {
                    const element = totalChars[index];
                    if (!bundleChars.has(element)) {
                        codes.push(element);
                    }
                }


                /** 自动分包内部的强制分包机制，保证 Latin1 这种数据集中在一个包，这样只有英文，无中文区域 */
                const unicodeForceBundle: number[][] = opt.unicodeRank ?? [
                    Latin,
                    await getCN_SC_Rank(),
                ];
                unicodeForceBundle.push(
                    codes.filter(
                        (i) => !unicodeForceBundle.some((includesCodes) => includesCodes.includes(i))
                    )
                );

                // console.log(featureMap.get(65176)) // Set(4) { 65176, 65188, 65182, 64849 }
                const contoursMap = await createContoursMap();
                /** 单包最大轮廓数值 */
                const contoursBorder = await calcContoursBorder(
                    hb,
                    face,
                    input.targetType ?? 'woff2',
                    contoursMap,
                    input.chunkSize ?? 70 * 1024
                );

                const autoPart: number[][] = [];
                for (const bundle of unicodeForceBundle) {
                    const subset = getAutoSubset(
                        bundle,
                        contoursBorder,
                        contoursMap,
                        featureMap,
                    );
                    autoPart.push(...subset);
                }
                // 检查 featureMap 中未使用的数据
                for (const [key, iterator] of featureMap.entries()) {
                    if (iterator) ctx.warn('featureMap ' + key + ' 未使用' + iterator.size);
                }

                const totalSubsets = [...forcePart, ...autoPart]
                const subsetCharsNumber = totalSubsets.reduce((col, cur) => {
                    col += cur.length
                    return col
                }, 0)
                if (subsetCharsNumber < totalChars.length) {
                    console.log("字符缺漏", subsetCharsNumber, totalChars.length)
                }
                // 在分包时仍然是成功的

                // totalSubsets.some((i) => [65176, 65188, 65182, 64849].every(ii => i.includes(ii))) && console.log('确认')
                ctx.set('subsetsToRun', totalSubsets);
                ctx.free('opentype_font');
            },
            /** 执行所有包的分包动作 */
            async function subsetFont(ctx) {
                const { input, face, blob, subsetsToRun, hb } = ctx.pick(
                    'input',
                    'face',
                    'blob',
                    'hb',
                    'subsetsToRun'
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
                const css = createCSS(subsetResult, nameTable, {
                    css: input.css,
                    compress: true,
                });
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
                        reporter
                    );
                }
            },
            async function outputReporter(ctx) {
                const { nameTable, subsetResult, input } = ctx.pick(
                    'input',
                    'nameTable',
                    'subsetResult'
                );
                if (!(input.testHTML === false && input.reporter === false)) {
                    const reporter = createReporter(
                        subsetResult,
                        nameTable,
                        input,
                        exec.records
                    );
                    await outputFile(
                        path.join(input.destFold, 'reporter.json'),
                        JSON.stringify(reporter)
                    );
                }
            },
            async function Clear(ctx) {
                const { input } = ctx.pick('input');
                input.threads?.service?.destroy();
            },
        ],
        createContext(opt)
    );
    const ctx = await exec.run();
};
