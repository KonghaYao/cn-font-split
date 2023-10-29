import fs from 'fs-extra';
import _ from 'lodash-es'
import { convert } from '@konghayao/cn-font-split';
const features = fs.readJSONSync('./FeatureConfig.json');

const wasmBlob = await fs.readFile('./node_modules/@konghayao/cn-font-split/dist/browser/hb-subset.wasm')
const { instance: { exports } } = await WebAssembly.instantiate(wasmBlob);


// fs.emptyDirSync('./temp');
for (const i of features) {
    const head = `./temp/font/${i.featureKey}/${i.featureKey}`
    const buffer = fs.readFileSync(head + `.woff2`)
    const fontBlob = await convert(new Uint8Array(buffer), 'ttf');
    fs.writeFileSync(head + `.ttf`, fontBlob)

    const heapu8 = new Uint8Array(exports.memory.buffer);
    const fontBuffer = exports.malloc(fontBlob.byteLength);
    heapu8.set(new Uint8Array(fontBlob), fontBuffer);

    /* Creating a face */
    const blob = exports.hb_blob_create(fontBuffer, fontBlob.byteLength, 2/*HB_MEMORY_MODE_WRITABLE*/, 0, 0);
    const face = exports.hb_face_create(blob, 0);
    exports.hb_blob_destroy(blob);

    /* Add your glyph indices here and subset */
    const input = exports.hb_subset_input_create_or_fail();

    const layoutFeatures = exports.hb_subset_input_set(
        input,
        6
    );
    exports.hb_set_clear(layoutFeatures);
    exports.hb_set_invert(layoutFeatures);
    const layoutScripts = exports.hb_subset_input_set(
        input,
        7
    );
    exports.hb_set_clear(layoutScripts);
    exports.hb_set_invert(layoutScripts);


    const unicode_set = exports.hb_subset_input_unicode_set(input);
    for (const text of i.splitText) {
        exports.hb_set_add(unicode_set, text.codePointAt(0));
    }

    // exports.hb_subset_input_set_drop_hints(input, true);
    const subset = exports.hb_subset_or_fail(face, input);

    /* Clean up */
    exports.hb_subset_input_destroy(input);

    /* Get result blob */
    const resultBlob = exports.hb_face_reference_blob(subset);

    const offset = exports.hb_blob_get_data(resultBlob, 0);
    const subsetByteLength = exports.hb_blob_get_length(resultBlob);
    if (subsetByteLength === 0) {
        exports.hb_blob_destroy(resultBlob);
        exports.hb_face_destroy(subset);
        exports.hb_face_destroy(face);
        exports.free(fontBuffer);
        throw new Error(
            'Failed to create subset font, maybe the input file is corrupted?'
        );
    }

    // Output font data(Uint8Array)
    const subsetFontBlob = heapu8.subarray(offset, offset + exports.hb_blob_get_length(resultBlob));

    await fs.outputFile(head + "-hb-wasm.ttf", subsetFontBlob);

    /* Clean up */
    exports.hb_blob_destroy(resultBlob);
    exports.hb_face_destroy(subset);
    exports.hb_face_destroy(face);
    exports.free(fontBuffer);
}
