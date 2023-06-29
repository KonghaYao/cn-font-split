import { isDeno, isNode } from "../utils/env";

const loadImageScript = async (): Promise<typeof import('@chinese-fonts/imagescript')> => {
    if (isNode) {
        /** @ts-ignore */
        return import("@chinese-fonts/imagescript/dist/index.font.js");
    } else if (isDeno) {
        /** @ts-ignore */
        return import(
            /** @ts-ignore */
            "@chinese-fonts/imagescript/dist/index.font.js"
        );
    } else {
        /** @ts-ignore */
        return import("@chinese-fonts/imagescript/dist/index.font.js");
        /** @ts-ignore */
        // return globalThis.ImageScript;
    }
};
export const makeImage = async (
    ttfFile: Uint8Array,
    text = "中文网字计划\nThe Project For Web",
    level = 9
) => {
    const { Image } = await loadImageScript();
    const Font = Image.renderText(ttfFile, 128, text);
    return Font.encode(level);
};
