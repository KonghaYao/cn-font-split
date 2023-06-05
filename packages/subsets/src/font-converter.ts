import wawoff2 from "wawoff2";
import woffTool from "woff2sfnt-sfnt2woff";
import { Buffer } from "buffer";
const supportedFormats = new Set(["sfnt", "woff", "woff2"]);

/** 检测字体类型 */
export const detectFormat = function (buffer: Buffer) {
    const signature = buffer.toString("ascii", 0, 4);
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
export type FontType = "truetype" | "sfnt" | "woff" | "woff2";

/** 字体格式转化 */
export const convert = async function (
    buffer: Buffer,
    toFormat: FontType,
    fromFormat?: FontType
) {
    if (toFormat === "truetype") {
        toFormat = "sfnt";
    }
    if (fromFormat === "truetype") {
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
        buffer = woffTool.toSfnt(buffer);
    } else if (fromFormat === "woff2") {
        buffer = Buffer.from(await wawoff2.decompress(buffer));
    }
    if (toFormat === "woff") {
        buffer = woffTool.toWoff(buffer);
    } else if (toFormat === "woff2") {
        buffer = Buffer.from(await wawoff2.compress(buffer));
    }
    return buffer;
};
