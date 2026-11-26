/**
 * 本包内对 harfbuzzjs 句柄的最小类型声明。
 * 原先从已删除的 `packages/subsets` 跨包引用，这里只保留本包实际用到的成员。
 */
export interface HbGlyphInfo {
    g: number;
    /** x 方向偏移 */
    dx: number;
    /** y 方向偏移 */
    dy: number;
    /** x 方向前进量 */
    ax: number;
    [key: string]: unknown;
}

export interface HbBuffer {
    addText(text: string): void;
    guessSegmentProperties(): void;
    setDirection(direction: 'ltr' | 'rtl' | 'ttb' | 'btt'): void;
    json(): HbGlyphInfo[];
    destroy(): void;
}

export interface HbFont {
    setScale(xScale: number, yScale: number): void;
    glyphToPath(glyphId: number): string;
}

export interface HbHandle {
    createBuffer(): HbBuffer;
    shape(font: HbFont, buffer: HbBuffer): void;
}

function shape(
    hb: HbHandle,
    font: HbFont,
    text: string,
    options: Font2SVGOptions,
) {
    font.setScale(100, -100);

    const buffer = hb.createBuffer();
    buffer.addText(text);
    buffer.guessSegmentProperties();
    buffer.setDirection(options.direction ?? 'ltr');
    hb.shape(font, buffer);
    const result = buffer.json();
    const glyphs = result.map(function (x) {
        return { ...x, glyph: font.glyphToPath(x.g) };
    });

    buffer.destroy();
    return glyphs;
}

export interface Font2SVGOptions {
    baseLine?: number;
    lineHeight?: number;
    direction?: 'ltr' | 'rtl' | 'ttb' | 'btt';
}

/** render harfbuzz info to svg */
export const makeImage = (
    hb: HbHandle,
    font: HbFont,
    input = '中文网字计划\nThe Project For Web',
    options: Font2SVGOptions = {},
) => {
    const { baseLine = 24, lineHeight = 1 } = options;
    const path = input
        .split('\n')
        .map((t) => shape(hb, font, t, options))
        .reduce((col, cur) => {
            col.push(
                ...cur,
                /** @ts-ignore 换行标识 */
                { g: 0, glyph: undefined } as unknown as any,
            );
            return col;
        }, []);
    const lineHeightPx = 100 * lineHeight;
    /** 每一行相关的大小 */
    const bounding = { height: lineHeightPx, width: 0 };
    /** 画布大小 */
    const maxBounding = { height: 0, width: 0 };
    const paths = path.map((i, index) => {
        if (i.glyph === undefined) {
            bounding.height += lineHeightPx;
            bounding.width = 0;
            maxBounding.height = Math.max(maxBounding.height, bounding.height);
            maxBounding.width = Math.max(maxBounding.width, bounding.width);
            return;
        }
        const path = `<path transform="translate(${i.dx + bounding.width} ${
            bounding.height + i.dy
        })" d="${i.glyph}"></path>`;
        bounding.width += i.ax;
        maxBounding.width = Math.max(maxBounding.width, bounding.width);
        return path;
    });
    return `<svg  xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${
        maxBounding.width
    }" height="${maxBounding.height}" viewBox="${0} ${0} ${
        maxBounding.width + baseLine
    } ${maxBounding.height + baseLine}">${paths.join('')}</svg>`;
};
