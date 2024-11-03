import { convert } from './convert/font-convert';
import { hbjs } from './hb';
import { Executor, PerformanceRecord } from './pipeline/index';
import { IContext, createContext } from './createContext';
import path from 'path';
import byteSize from 'byte-size';
import { IOutputFile, InputTemplate } from './interface';
import { BundleReporter, createReporter } from './templates/reporter';
import { createCSS } from './templates/css';
import { useSubset } from './RunSubset/index';
import { Assets } from './adapter/assets';
import { env } from './utils/env';
import { ConvertManager } from './convert/convert.manager';
import { makeImage } from 'font-sharp/dist/font-sharp/src/makeImage.js';
import {
    createFontBaseTool,
    getFVarTable,
    getNameTableFromTool,
} from './feature/getFeatureQueryFromBuffer';
export { type FontReporter } from './templates/reporter';
import wrapper from '@konghayao/harfbuzzjs/hb-subset.js';
import { PreSubset } from './PreSubset.js';

export { type IContext } from './createContext';

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
            PreSubset,
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
