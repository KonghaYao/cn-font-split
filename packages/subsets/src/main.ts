import { convert } from './convert/font-convert';
import { hbjs } from './hb';
import { Executor, PerformanceRecord } from './pipeline/index';
import { IContext, createContext } from './createContext';
import path from 'path';
import byteSize from 'byte-size';
import { IOutputFile, InputTemplate } from './interface';
import { BundleReporter, createReporter } from './templates/reporter';
import { createCSS } from './templates/css';
import { subsetsToSet } from './utils/subsetsToSet';
import { useSubset } from './useSubset/index';
import { getAutoSubset } from './useSubset/getAutoSubset';
import {
    Arabic,
    Bengali,
    Cyrillic,
    CyrillicExt,
    Devanagari,
    Greek,
    GreekExt,
    Khmer,
    Latin,
    LatinExt,
    Thai,
    Vietnamese,
    getCN_SC_Rank,
} from './data/LanguageRange';
import { Assets } from './adapter/assets';
import { env } from './utils/env';
import { ConvertManager } from './convert/convert.manager';
import { makeImage } from 'font-sharp/dist/font-sharp/src/makeImage.js';
import { getFeatureData, getFeatureMap } from './feature/featureMap';
import { forceSubset } from './feature/forceSubset';
import { calcContoursBorder } from './useSubset/calcContoursBorder';
import { createContoursMap } from './useSubset/createContoursMap';
import { reduceMinsPackage } from './useSubset/reduceMinsPackage';
import {
    createFontBaseTool,
    getFVarTable,
    getNameTableFromTool,
} from './feature/getFeatureQueryFromBuffer';
export { type FontReporter } from './templates/reporter';
import { differenceSet } from './utils/CharSetTool';
import wrapper from '@konghayao/harfbuzzjs/hb-subset.js';

export { type IContext } from './createContext'

/** 从路径或者二进制数据获取原始字体文件 */
async function LoadFile(ctx: IContext) {
    ctx.info(`cn-font-split@${__cn_font_split_version__} 环境检测\t`, env);
    const { input } = ctx.pick('input');

    // 注册日志函数
    typeof input.log === 'function' && ctx.registerLog(input.log);

    // 获取二进制文件
    let res!: Uint8Array;
    if (typeof input.FontPath === 'string') {
        res = await Assets.loadFileAsync(input.FontPath);
    } else if (input.FontPath instanceof Uint8Array) {
        res = new Uint8Array(input.FontPath);
    }

    ctx.trace('输入文件大小：' + byteSize(res.byteLength));
    ctx.set('bundleMessage', { originLength: res.byteLength });
    ctx.set('originFile', res);
}

/** 转换为 TTF 格式，这样可以被 HarfBuzz 操作 */
async function transferFontType(ctx: IContext) {
    const { originFile, bundleMessage, input } = ctx.pick(
        'originFile',
        'bundleMessage',
        'input',
    );
    const ttfFile = (
        await convert(originFile, 'truetype', undefined, input.buildMode)
    ).slice(0);

    bundleMessage.ttfLength = ttfFile.byteLength;
    ctx.set('ttfBufferSize', ttfFile.byteLength);
    ctx.set('ttfFile', ttfFile);
    ctx.free('originFile');
}
/** 加载 Harfbuzz 字体操作库 */
async function loadHarbuzz(ctx: IContext) {
    const { ttfFile, input: opt } = ctx.pick('input', 'ttfFile');

    const hb = hbjs(await wrapper());
    const blob = hb.createBlob(ttfFile);
    const face = hb.createFace(blob, 0);
    blob.destroy();
    ctx.set('hb', hb);
    ctx.set('face', face);
    ctx.set('blob', blob);
    if (opt.threads !== false) {
        opt.threads = opt.threads || {};
        opt.threads.service = new ConvertManager(opt.threads.options);
    }
}
async function initOpentype(ctx: IContext) {
    const { ttfFile } = ctx.pick('input', 'ttfFile');
    const fontTool = createFontBaseTool(ttfFile.buffer);
    ctx.set('fontTool', fontTool);
    ctx.free('ttfFile');
}
function createImageProcess(outputFile: IOutputFile) {
    return async function createImage(ctx: IContext) {
        const { input, hb, face } = ctx.pick('input', 'hb', 'face');
        if (input.previewImage) {
            const font = hb.createFont(face);
            const encoded = await makeImage(hb, font, input.previewImage?.text);
            font.destroy();
            await outputFile(
                path.join(input.destFold, 'preview' + '.svg'),
                encoded,
            );
        }
    };
}
/** 获取字体的基础信息，如字体族类，license等 */
async function getBasicMessage(ctx: IContext) {
    const { fontTool } = ctx.pick('fontTool', 'face');
    const nameTable = getNameTableFromTool(fontTool);
    ctx.set('nameTable', nameTable);

    const fvar = getFVarTable(fontTool);
    if (fvar) {
        ctx.set('VF', fvar);
    } else {
        ctx.set('VF', null);
    }
}

/** 通过数据计算得出分包的数据结构 */
async function PreSubset(ctx: IContext) {
    const { input, hb, face, ttfBufferSize, bundleMessage, fontTool } =
        ctx.pick(
            'input',
            'face',
            'hb',
            'ttfBufferSize',
            'bundleMessage',
            'fontTool',
        );
    const UserSubsets = input.subsets ?? []; // 1
    const totalChars = face.collectUnicodes();
    ctx.trace('总字符数', totalChars.length);
    bundleMessage.originSize = totalChars.length;
    const AllUnicodeSet = new Set([...totalChars].sort()); // 2
    differenceSet(AllUnicodeSet, subsetsToSet(UserSubsets)); //3
    /**  默认语言强制分包，保证 Latin1 这种数据集中在一个包，这样只有英文，无中文区域 */
    const autoForceBundle: number[][] = (
        input.unicodeRank ?? [
            Latin,
            LatinExt,
            Vietnamese,
            Greek,
            GreekExt,
            Cyrillic,
            CyrillicExt,
            await getCN_SC_Rank(),
            Bengali,
            Devanagari,
            Arabic,
            Thai,
            Khmer,
        ]
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
    differenceSet(AllUnicodeSet, ForcePartSubsets.flat()); // 6

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
        input.buildMode,
    );

    const AutoPartSubsets: number[][] = [];
    /** 计算合理的单个分包的理论字符上限，尽量保证不会出现超大分包 */
    const maxCharSize =
        ((input.chunkSizeTolerance ?? 1.7) *
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
        if (iterator) ctx.warn('featureMap ' + key + ' 未使用' + iterator.size);
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
    if (input.autoChunk !== false && subsetCharsNumber < totalChars.length) {
        ctx.trace('字符缺漏', subsetCharsNumber, totalChars.length);
    } // 11

    if (totalSubsets.length >= (input.maxAllowSubsetsCount ?? 600))
        throw new Error(
            '分包数为' +
            totalSubsets.length +
            '，超过了期望最大分包数，将会导致您的机器过久运行',
        );
    ctx.set('subsetsToRun', totalSubsets);
    ctx.free('ttfFile');
}
/** 执行所有包的分包动作 */
function createSubsetFontProcess(outputFile: IOutputFile) {
    return async function subsetFont(ctx: IContext) {
        const { input, face, blob, subsetsToRun, hb, bundleMessage } = ctx.pick(
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
                return outputFile(path.join(input.destFold, filename), buffer);
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
    };
}
function createOutputCSSProcess(outputFile: IOutputFile) {
    /** 输出 css 文件 */
    return async function outputCSS(ctx: IContext) {
        const { nameTable, subsetResult, input, VF } = ctx.pick(
            'input',
            'nameTable',
            'subsetResult',
            'VF',
        );
        const css = createCSS(subsetResult, nameTable, input.css, VF);
        await outputFile(
            path.join(input.destFold, input.cssFileName ?? 'result.css'),
            css.css,
        );
        ctx.set('cssMessage', css);
    };
}
function createOutputHTMLProcess(outputFile: IOutputFile) {
    return async function outputHTML(ctx: IContext) {
        const { input } = ctx.pick('input');
        if (input.testHTML !== false) {
            const { createTestHTML } = await import('./templates/html/index');
            const reporter = createTestHTML();
            await outputFile(
                path.join(input.destFold, 'index.html'),
                await reporter,
            );
        }
    };
}
function outputReporter(
    outputFile: IOutputFile,
    getRecords: () => PerformanceRecord[],
) {
    return async function (ctx: IContext) {
        const { nameTable, subsetResult, input, bundleMessage, cssMessage } =
            ctx.pick(
                'input',
                'nameTable',
                'subsetResult',
                'bundleMessage',
                'cssMessage',
            );
        if (!(input.testHTML === false && input.reporter === false)) {
            /** @ts-ignore */
            delete cssMessage.css;
            const reporter = await createReporter(
                subsetResult,
                nameTable,
                input,
                getRecords(),
                bundleMessage as BundleReporter,
                cssMessage,
            );
            await outputFile(
                path.join(input.destFold, 'reporter.json'),
                JSON.stringify(reporter),
            );
            ctx.set('reporter', reporter);
        } else {
            /** @ts-ignore */
            ctx.set('reporter', undefined); // 防止识别失败报错
        }
    };
}

async function Clear(ctx: IContext) {
    const { input } = ctx.pick('input');
    input.threads && input.threads?.service?.destroy();
}

export const fontSplit = async (opt: InputTemplate) => {
    const outputFile = opt.outputFile ?? Assets.outputFile;
    const records: PerformanceRecord[] = [];
    const exec = new Executor(
        [
            LoadFile,
            transferFontType,
            loadHarbuzz,
            initOpentype,
            createImageProcess(outputFile),
            getBasicMessage,
            opt.plugins?.PreSubset ?? PreSubset,
            createSubsetFontProcess(outputFile),
            createOutputCSSProcess(outputFile),
            createOutputHTMLProcess(outputFile),
            outputReporter(outputFile, () => records),
            Clear,
        ],
        createContext(opt),
        records,
    );
    const ctx = await exec.run();
    const { reporter } = ctx.pick('reporter');
    return reporter;
};
