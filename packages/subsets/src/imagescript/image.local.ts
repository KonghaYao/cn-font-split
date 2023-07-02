
export const makeImage = async (
    ttfFile: Uint8Array,
    text = "中文网字计划\nThe Project For Web",
    level = 9
) => {
    const { Image } = await import("@chinese-fonts/imagescript/dist/index.font.js")
    const Font = Image.renderText(ttfFile, 128, text);
    return Font.encode(level);
};
