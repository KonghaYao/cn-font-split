const featurelist = [
    'aalt',
    'abvf',
    'abvm',
    'abvs',
    'afrc',
    'akhn',
    'blwf',
    'blwm',
    'blws',
    'calt',
    'case',
    'ccmp',
    'cfar',
    'chws',
    'cjct',
    'clig',
    'cpct',
    'cpsp',
    'cswh',
    'curs',
    "cv01 – 'cv99'",
    'c2pc',
    'c2sc',
    'dist',
    'dlig',
    'dnom',
    'dtls',
    'expt',
    'falt',
    'fin2',
    'fin3',
    'fina',
    'flac',
    'frac',
    'fwid',
    'half',
    'haln',
    'halt',
    'hist',
    'hkna',
    'hlig',
    'hngl',
    'hojo',
    'hwid',
    'init',
    'isol',
    'ital',
    'jalt',
    'jp78',
    'jp83',
    'jp90',
    'jp04',
    'kern',
    'lfbd',
    'liga',
    'ljmo',
    'lnum',
    'locl',
    'ltra',
    'ltrm',
    'mark',
    'med2',
    'medi',
    'mgrk',
    'mkmk',
    'mset',
    'nalt',
    'nlck',
    'nukt',
    'numr',
    'onum',
    'opbd',
    'ordn',
    'ornm',
    'palt',
    'pcap',
    'pkna',
    'pnum',
    'pref',
    'pres',
    'pstf',
    'psts',
    'pwid',
    'qwid',
    'rand',
    'rclt',
    'rkrf',
    'rlig',
    'rphf',
    'rtbd',
    'rtla',
    'rtlm',
    'ruby',
    'rvrn',
    'salt',
    'sinf',
    'size',
    'smcp',
    'smpl',
    'ss01',
    'ss02',
    'ss03',
    'ss04',
    'ss05',
    'ss06',
    'ss07',
    'ss08',
    'ss09',
    'ss10',
    'ss11',
    'ss12',
    'ss13',
    'ss14',
    'ss15',
    'ss16',
    'ss17',
    'ss18',
    'ss19',
    'ss20',
    'ssty',
    'stch',
    'subs',
    'sups',
    'swsh',
    'titl',
    'tjmo',
    'tnam',
    'tnum',
    'trad',
    'twid',
    'unic',
    'valt',
    'vatu',
    'vchw',
    'vert',
    'vhal',
    'vjmo',
    'vkna',
    'vkrn',
    'vpal',
    'vrt2',
    'vrtr',
    'zero',
];
import { parse } from 'opentype.js'
import { Subset, Subsets } from './interface';
/** 获取到所有的 feature 字体数据，并合并为一个单元 */
export const getFeaturePackageList = (buffer: Uint8Array, MaxLengthPer = 300): Subsets => {
    const font = parse(buffer.buffer);


    // https://learn.microsoft.com/zh-cn/typography/opentype/spec/featurelist
    const featureData = featurelist
        .flatMap((i) => {
            const getFeature: (i: string) => { sub: number | number[], by: number | number[] }[] = font.substitution
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                /** @ts-ignore */
                .getFeature.bind(font.substitution)
            return (
                getFeature(i)
                    ?.map((ii) => [ii.sub, ii.by].flat())
                    .map((ids) =>
                        ids
                            .map((id) => {
                                const item = font.glyphs.get(id);
                                return item.unicode ?? item.unicodes;
                            })
                            .flat()
                    ) ?? []
            );
        })
        .filter((i) => i.length > 1);


    const result: Set<number>[] = []

    featureData.forEach((data) => {
        const final = result[result.length - 1]
        if (final === undefined) {
            result.push(new Set(data))
        } else if (data.length + final.size >= MaxLengthPer) {
            result.push(new Set(data))
        } else {
            data.forEach(i => final.add(i))
        }

    })
    // console.log()
    return result.map(i => [...i])

    // throw new Error('')
    // return [...new Set(featureData.flat(2))]
}
