import wawoff2 from "wawoff2";
// import woffTool from "woff2sfnt-sfnt2woff";
const supportedFormats = new Set(["sfnt", "woff", "woff2"]);

/** 检测字体类型 */
export const detectFormat = function (buffer: Uint8Array) {
    const signature = String.fromCharCode(...buffer.subarray(0, 4));
    if (signature === "wOFF") {
        return "woff";
    } else if (signature === "wOF2") {
        return "woff2";
    } else if (
        signature === "true" ||
        signature === "OTTO" ||
        signature === "\x00\x01\x00\x00"
    ) {
        return "sfnt";
    } else {
        throw new Error(`Unrecognized font signature: ${signature}`);
    }
};
export type FontType = "otf" | "ttf" | "truetype" | "sfnt" | "woff" | "woff2";

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
        buffer = await wawoff2.decompress(buffer);
    }
    if (toFormat === "woff2") {
        buffer = await wawoff2.compress(buffer);
    }
    return buffer;
};
