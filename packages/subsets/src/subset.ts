import { hbjs } from "./hb.js";
import { Buffer } from "buffer";

function HB_TAG(str: string) {
    return str.split("").reduce(function (a, ch) {
        return (a << 8) + ch.charCodeAt(0);
    }, 0);
}

export interface Options {
    variationAxes?: string;
    preserveNameIds?: string;
}

export async function subsetFont(
    /** 注意，buffer 必须为 TTF，你可以使用 converter 转换 */
    TTFBuffer: Buffer,
    text: string,
    hb: ReturnType<typeof hbjs>,
    { preserveNameIds, variationAxes }: Options = {}
) {
    if (typeof text !== "string") {
        throw new Error("The subset text must be given as a string");
    }

    // 获取 instance数据
    const { exports, heapu8 } = hb;

    const blob = hb.createBlob(TTFBuffer);

    const face = hb.createFace(blob, 0);
    const facePtr = face.ptr;
    blob.destroy();

    const input = exports.hb_subset_input_create_or_fail();
    if (input === 0) {
        throw new Error(
            "hb_subset_input_create_or_fail (harfbuzz) returned zero, indicating failure"
        );
    }
    // Do the equivalent of --font-features=*
    const layoutFeatures = exports.hb_subset_input_set(
        input,
        6 // HB_SUBSET_SETS_LAYOUT_FEATURE_TAG
    );
    exports.hb_set_clear(layoutFeatures);
    exports.hb_set_invert(layoutFeatures);
    if (preserveNameIds) {
        const inputNameIds = exports.hb_subset_input_set(
            input,
            4 // HB_SUBSET_SETS_NAME_ID
        );
        for (const nameId of preserveNameIds) {
            exports.hb_set_add(inputNameIds, nameId);
        }
    }
    // Add unicodes indices
    const inputUnicodes = exports.hb_subset_input_unicode_set(input);
    for (const c of text) {
        exports.hb_set_add(inputUnicodes, c.codePointAt(0));
    }
    if (variationAxes) {
        for (const [axisName, value] of Object.entries(variationAxes)) {
            exports.hb_subset_input_pin_axis_location(
                input,
                facePtr,
                HB_TAG(axisName),
                value
            );
        }
    }
    let subset;
    try {
        subset = exports.hb_subset_or_fail(facePtr, input);
        if (subset === 0) {
            face.destroy();
            blob.free();
            throw new Error(
                "hb_subset_or_fail (harfbuzz) returned zero, indicating failure. Maybe the input file is corrupted?"
            );
        }
    } finally {
        // Clean up
        exports.hb_subset_input_destroy(input);
    }
    // Get result blob
    const result = exports.hb_face_reference_blob(subset);
    const offset = exports.hb_blob_get_data(result, 0);
    const subsetByteLength = exports.hb_blob_get_length(result);
    if (subsetByteLength === 0) {
        exports.hb_blob_destroy(result);
        exports.hb_face_destroy(subset);
        face.destroy();
        blob.free();
        throw new Error(
            "Failed to create subset font, maybe the input file is corrupted?"
        );
    }
    console.log(subsetByteLength);
    const subsetFont = Buffer.from(
        heapu8.subarray(offset, offset + subsetByteLength)
    );
    // Clean up
    exports.hb_blob_destroy(result);
    exports.hb_face_destroy(subset);
    face.destroy();
    blob.free();
    return subsetFont;
}
