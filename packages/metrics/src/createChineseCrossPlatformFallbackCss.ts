import {
    MicrosoftYaHei,
    NotoSansCJKscRegular,
    PingFangSCRegular,
    PingFangSCSemibold,
} from './metrics';
import { readMetrics, generateFontFace } from 'fontaine';
import { pathToFileURL } from 'url';

type FontFaceMetrics = NonNullable<Awaited<ReturnType<typeof readMetrics>>>;
export const createFontFallbackCss = async (
    name: string,
    fontPath: string,
    fallbackMetrics: FontFaceMetrics,
) => {
    const metrics = await readMetrics(pathToFileURL(fontPath));

    return generateFontFace(metrics!, {
        name: name + ' fallback',
        font: name,
        metrics: fallbackMetrics,
    });
};
export const createChineseCrossPlatformFallbackCss = async (
    fontPath: string,
    key = '',
) => {
    const m = await readMetrics(pathToFileURL(fontPath));
    const config = [
        {
            name: 'PingFangSC-Semibold',
            metrics: PingFangSCSemibold,
        },
        {
            name: 'PingFangSC-Regular',
            metrics: PingFangSCRegular,
        },
        {
            name: 'Microsoft YaHei',
            metrics: MicrosoftYaHei,
        },
        {
            name: 'Source Han Sans',
            metrics: NotoSansCJKscRegular,
        },
    ];
    const fontFamilyString = config
        .map(({ name }) => `"${name} fallback${key}"`)
        .join(',');
    return {
        fontFamilyString,
        css: config
            .map(({ name, metrics }) => {
                return generateFontFace(m!, {
                    name: name + ' fallback' + key,
                    font: name,
                    metrics,
                });
            })
            .join('\n'),
    };
};
