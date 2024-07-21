/** 一个可以动态更新 html 中的字体样式的工具 */

/**
 * 异步获取中文网字计划的字体映射表。
 *
 * @param basePath 字体资源的基础路径，默认为'https://chinese-fonts-cdn.netlify.app'。
 * @example
 * const CNFontMap = await getChineseFontsMap()
 * const fontReplacer = new FontReplacer(CNFontMap)
 */
export const getChineseFontsMap = async (
    basePath = 'https://chinese-fonts-cdn.netlify.app',
) => {
    const data = await fetch(basePath + '/index.json').then((res) =>
        res.json(),
    );
    const CNFontMap = Object.fromEntries(
        Object.values(data).flatMap((i: any) => {
            return i.remotePath.map((item: any) => {
                return [
                    i.name +
                        '.' +
                        item.path.replace('/result.css', '').split('/dist/')[1],
                    {
                        cssUrl: basePath + '/' + item.path,
                        fontFamily: item.css.family,
                        fontWeight: item.css.weight,
                    },
                ];
            });
        }),
    );
    return CNFontMap;
};

/**
 * 字体替换器类，用于动态替换HTML中的字体样式。
 */
export class FontReplacer<
    FontMap extends Record<
        string,
        { cssUrl: string; fontFamily: string; fontWeight: number }
    >,
> {
    fontMap: Map<string, StyleEl>;
    constructor(public source: FontMap) {
        this.fontMap = new Map();
        const style = document.createElement('style');
        style.innerText = this.style;
        document.body.appendChild(style);
    }

    /**
     * 应用字体到指定的元素。
     *
     * @param el 要应用字体的元素，可以是元素选择器字符串或HTMLElement对象。
     * @param name fontMap 的 key 值
     */
    applyFont(el: string | HTMLElement, name: string) {
        this.loadFont(name);
        const ele =
            typeof el === 'string'
                ? (document.querySelector(el) as HTMLElement)
                : el;
        ele.style.setProperty(
            '--font-replacer-weight',
            this.getFontMeta(name).fontWeight.toString(),
        );
        ele.style.setProperty(
            '--font-replacer-family',
            `"${this.getFontMeta(name).fontFamily}"`,
        );
        ele.classList.add('font-replacer-control');
    }
    /** 清除对 el 元素的字体挂载 */
    clearFont(el: string | HTMLElement) {
        const ele =
            typeof el === 'string'
                ? (document.querySelector(el) as HTMLElement)
                : el;
        ele.style.removeProperty('--font-replacer-weight');
        ele.style.removeProperty('--font-replacer-family');
        ele.classList.remove('font-replacer-control');
    }
    style =
        '.font-replacer-control{ font-family:var(--font-replacer-family);font-weight:var(--font-replacer-weight); }';
    /**
     * 获取指定字体的元数据。
     */
    private getFontMeta(name: string) {
        if (!this.source[name])
            throw new Error(`FontReplace.getFontMeta: ${name} not found`);
        return this.source[name];
    }
    /**
     * 加载指定字体。
     *
     * @param name 字体名称。
     * @returns 返回StyleEl对象，表示已加载的字体样式元素。
     */
    private loadFont(name: string) {
        if (this.fontMap.has(name)) return this.fontMap.get(name);
        const style = new StyleEl(name);
        style.loadFontCSS(this.getFontMeta(name).cssUrl).mount();
        this.fontMap.set(name, style);
        return style;
    }
}

/**
 * 样式元素类，用于管理CSS样式和链接元素。
 */
class StyleEl {
    el: HTMLStyleElement;
    link: HTMLLinkElement;
    constructor(public name: string) {
        this.el = document.createElement('style');
        this.link = document.createElement('link');
        this.link.rel = 'stylesheet';
    }
    /**
     * 加载字体CSS资源。
     *
     * @param url 字体CSS的URL。
     * @returns 返回当前StyleEl实例，支持链式调用。
     */
    loadFontCSS(url: string) {
        this.link.href = url;
        return this;
    }
    /**
     * 将样式和链接元素挂载到文档头部。
     */
    mount() {
        document.head.appendChild(this.el);
        document.head.appendChild(this.link);
    }
    /**
     * 从文档中卸载样式和链接元素。
     */
    unmount() {
        this.el.remove();
        this.link.remove();
    }
}
