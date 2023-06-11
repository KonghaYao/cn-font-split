import { FontType } from "../font-converter.js";

export const Extensions = {
    otf: "otf",
    ttf: "ttf",
    sfnt: "otf",
    truetype: "ttf",
    woff: "woff",
    woff2: "woff2",
} as const;
export const getExtensionsByFontType = (targetType: FontType) => {
    return "." + Extensions[targetType];
};
