const FormatsMap = {
    '.otc': 'collection',
    '.ttc': 'collection',
    '.eot': 'embedded-opentype',
    '.otf': 'opentype',
    '.ttf': 'truetype',
    '.svg': 'svg',
    '.svgz': 'svg',
    '.woff': 'woff',
    '.woff2': 'woff2',
};
export const getFormatFromFontPath = (path: string) => {
    const all = Object.keys(FormatsMap) as (keyof typeof FormatsMap)[];
    for (const iterator of all) {
        if (path.endsWith(iterator)) {
            return FormatsMap[iterator];
        }
    }
    return undefined;
};
