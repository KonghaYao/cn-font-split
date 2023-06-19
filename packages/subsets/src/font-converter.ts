import { FontType, supportedFormats, detectFormat } from "./detectFormat";
import { cacheResult } from "./utils/cacheResult";

const loadDecompress = cacheResult(() =>
    import("@chinese-fonts/wawoff2/decompress.js").then((res) => res.decompress)
);
const loadCompress = cacheResult(async () =>
    import("@chinese-fonts/wawoff2/compress.js").then((res) => res.compress)
);

/** 字体格式转化 */
export const convert = async function (
    buffer: Uint8Array,
    toFormat: FontType,
    fromFormat?: FontType
) {
    const snft = ["truetype", "ttf", "otf"];
    if (snft.includes(toFormat)) {
        toFormat = "sfnt";
    }
    if (snft.includes(fromFormat!)) {
        fromFormat = "sfnt";
    }
    if (!supportedFormats.has(toFormat)) {
        throw new Error(`Unsupported target format: ${toFormat}`);
    }
    if (fromFormat) {
        if (!supportedFormats.has(fromFormat)) {
            throw new Error(`Unsupported source format: ${fromFormat}`);
        }
    } else {
        fromFormat = detectFormat(buffer);
    }
    if (fromFormat === toFormat) {
        return buffer;
    }
    if (fromFormat === "woff") {
        // buffer = woffTool.toSfnt(buffer);
        throw new Error("Unsupported source format: woff");
    } else if (fromFormat === "woff2") {
        const decompress = await loadDecompress();
        buffer = await decompress(buffer);
    }
    if (toFormat === "woff2") {
        const compress = await loadCompress();
        buffer = await compress(buffer);
    }
    return buffer;
};
