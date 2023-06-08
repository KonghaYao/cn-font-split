import { InputTemplate, SubsetResult } from "../interface";

const trans: Record<string, number> = {
    thin: 100,
    light: 300,
    regular: 400,
    medium: 500,
    bold: 700,
    black: 900,
};

export const subFamilyToWeight = (str: string) => {
    const items = str.split(" ");
    let weight = 400;
    items.some((i) => {
        if (i in trans) {
            weight = trans[i];
            return true;
        }
    });
    return weight;
};

export const isItalic = (str: string) => {
    return str.toLowerCase().includes("Italic");
};
export const createCSS = (
    subsetResult: SubsetResult,
    fontData: Record<string, string>,
    opts: {
        css: InputTemplate["css"];
        compress: boolean;
    }
) => {
    const css = opts.css || {};
    const family =
        fontData.preferredFamily || fontData.fontFamily || css.fontFamily;

    const preferredSubFamily =
        fontData.preferredSubFamily || fontData.fontSubFamily;

    const style =
        css.fontStyle || isItalic(preferredSubFamily) ? "italic" : "normal";
    const weight = css.fontWeight || subFamilyToWeight(preferredSubFamily);
    const cssStyleSheet = subsetResult
        .map(({ path, unicodeRange }) => {
            return `@font-face {
font-family: "${family}";
src: url("./${path}");
font-style: ${style};
font-weight: ${weight};
font-display: ${css.fontDisplay || "swap"};
unicode-range:${unicodeRange};
}`;
        })
        .join("\n");
    const header =
        "/*Created By cn-font-split https://www.npmjs.com/package/@konghayao/cn-font-split\n" +
        Object.entries(fontData)
            .map((i) => i.join(": "))
            .join("\n") +
        "\n */\n\n";
    return header + cssStyleSheet;
};
