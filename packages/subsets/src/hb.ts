function hb_tag(s: string) {
    return (
        ((s.charCodeAt(0) & 0xff) << 24) |
        ((s.charCodeAt(1) & 0xff) << 16) |
        ((s.charCodeAt(2) & 0xff) << 8) |
        ((s.charCodeAt(3) & 0xff) << 0)
    );
}
function HB_TAG(str: string) {
    return str.split('').reduce(function (a, ch) {
        return (a << 8) + ch.charCodeAt(0);
    }, 0);
}
function _hb_untag(tag: number) {
    return [
        String.fromCharCode((tag >> 24) & 0xff),
        String.fromCharCode((tag >> 16) & 0xff),
        String.fromCharCode((tag >> 8) & 0xff),
        String.fromCharCode((tag >> 0) & 0xff),
    ].join('');
}
export type BufferFlag =
    | 'BOT'
    | 'EOT'
    | 'PRESERVE_DEFAULT_IGNORABLES'
    | 'REMOVE_DEFAULT_IGNORABLES'
    | 'DO_NOT_INSERT_DOTTED_CIRCLE'
    | 'PRODUCE_UNSAFE_TO_CONCAT';

function _buffer_flag(s: BufferFlag) {
    const flagMap = {
        BOT: 0x1,
        EOT: 0x2,
        PRESERVE_DEFAULT_IGNORABLES: 0x4,
        REMOVE_DEFAULT_IGNORABLES: 0x8,
        DO_NOT_INSERT_DOTTED_CIRCLE: 0x10,
        PRODUCE_UNSAFE_TO_CONCAT: 0x40,
    };
    return flagMap[s] || 0x0;
}

export declare namespace HB {
    export type Handle = ReturnType<typeof hbjs>;
    export type Face = ReturnType<ReturnType<typeof hbjs>['createFace']>;
    export type Blob = ReturnType<ReturnType<typeof hbjs>['createBlob']>;
    export type Font = ReturnType<ReturnType<typeof hbjs>['createFont']>;
    export type Buffer = ReturnType<ReturnType<typeof hbjs>['createBuffer']>;
}

/**
 * 封装 harfbuzz wasm 的函数
 * @message copied from https://github.com/harfbuzz/harfbuzzjs/blob/main/hbjs.js
 * @author refactor and modify by konghayao
 */
export function hbjs(instance: WebAssembly.Instance) {
    'use strict';

    const exports = instance.exports as any;
    const heapu8 = new Uint8Array(exports.memory.buffer);
    const heapu32 = new Uint32Array(exports.memory.buffer);
    const heapi32 = new Int32Array(exports.memory.buffer);
    const heapf32 = new Float32Array(exports.memory.buffer);
    const utf8Decoder = new TextDecoder('utf8');

    const HB_MEMORY_MODE_WRITABLE = 2;
    const HB_SET_VALUE_INVALID = -1;

    /**
     * Create an object representing a Harfbuzz blob.
     * @param blob A blob of binary data (usually the contents of a font file).
     **/
    function createBlob(
        /** A blob of binary data (usually the contents of a font file). */
        blob: Uint8Array,
    ) {
        const blobPtr = exports.malloc(blob.byteLength);
        heapu8.set(blob, blobPtr);
        const ptr = exports.hb_blob_create(
            blobPtr,
            blob.byteLength,
            HB_MEMORY_MODE_WRITABLE,
            blobPtr,
            exports.free_ptr(),
        );
        return {
            ptr: ptr,
            blobPtr,
            /**
             * Free the object.
             */
            destroy() {
                exports.hb_blob_destroy(ptr);
            },
            free() {
                exports.free(blobPtr);
            },
        };
    }

    /**
     * Return the typed array of HarfBuzz set contents.
     * @template {typeof Uint8Array | typeof Uint32Array | typeof Int32Array | typeof Float32Array} T
     * @param {number} setPtr Pointer of set
     * @param {T} arrayClass Typed array class
     * @returns {InstanceType<T>} Typed array instance
     */

    function typedArrayFromSet(
        setPtr: number,
        arrayClass: typeof Float32Array,
    ): InstanceType<typeof Float32Array>;
    function typedArrayFromSet(
        setPtr: number,
        arrayClass: typeof Int32Array,
    ): InstanceType<typeof Int32Array>;
    function typedArrayFromSet(
        setPtr: number,
        arrayClass: typeof Uint32Array,
    ): InstanceType<typeof Uint32Array>;
    function typedArrayFromSet(
        setPtr: number,
        arrayClass: typeof Uint8Array,
    ): InstanceType<typeof Uint8Array>;
    function typedArrayFromSet(
        setPtr: number,
        arrayClass: { BYTES_PER_ELEMENT: number },
    ): unknown {
        let heap: Uint8Array | Uint32Array | Int32Array | Float32Array = heapu8;
        if (arrayClass === Uint32Array) {
            heap = heapu32;
        } else if (arrayClass === Int32Array) {
            heap = heapi32;
        } else if (arrayClass === Float32Array) {
            heap = heapf32;
        }
        const bytesPerElement = arrayClass.BYTES_PER_ELEMENT;
        const setCount = exports.hb_set_get_population(setPtr);
        const arrayPtr = exports.malloc(setCount * bytesPerElement);
        const arrayOffset = arrayPtr / bytesPerElement;
        const array = heap.subarray(arrayOffset, arrayOffset + setCount);
        heap.set(array, arrayOffset);
        exports.hb_set_next_many(
            setPtr,
            HB_SET_VALUE_INVALID,
            arrayPtr,
            setCount,
        );
        return array;
    }

    /**
     * Return unicodes the face supports
     */
    function collectUnicodes(ptr?: number) {
        const unicodeSetPtr = exports.hb_set_create();
        exports.hb_face_collect_unicodes(ptr, unicodeSetPtr);
        const result = typedArrayFromSet(unicodeSetPtr, Uint32Array);
        exports.hb_set_destroy(unicodeSetPtr);
        return result;
    }
    /**
     * Create an object representing a Harfbuzz face.
     * @param blob An object returned from `createBlob`.
     * @param index The index of the font in the blob. (0 for most files,
     *  or a 0-indexed font number if the `blob` came form a TTC/OTC file.)
     **/
    function createFace(blob: ReturnType<typeof createBlob>, index: number) {
        const ptr = exports.hb_face_create(blob.ptr, index);
        const upem = exports.hb_face_get_upem(ptr);
        return {
            ptr,
            upem,
            /**
             * Return the binary contents of an OpenType table.
             * @param {string} table Table name
             */
            reference_table(table: string) {
                const blob = exports.hb_face_reference_table(
                    ptr,
                    hb_tag(table),
                );
                const length = exports.hb_blob_get_length(blob);
                if (!length) {
                    throw new Error(' 引用字体文件中 table 失败');
                }
                const blobptr = exports.hb_blob_get_data(blob, null);
                const table_string = heapu8.subarray(blobptr, blobptr + length);
                return table_string;
            },
            collectUnicodes() {
                return collectUnicodes(ptr);
            },
            /**
             * Return letiation axis infos
             */
            getAxisInfos() {
                const axis = exports.malloc(64 * 32);
                const c = exports.malloc(4);
                heapu32[c / 4] = 64;
                exports.hb_ot_var_get_axis_infos(ptr, 0, c, axis);
                const result: Record<
                    string,
                    { min: number; max: number; default: number }
                > = {};
                Array.from({ length: heapu32[c / 4] }).forEach(function (_, i) {
                    result[_hb_untag(heapu32[axis / 4 + i * 8 + 1])] = {
                        min: heapf32[axis / 4 + i * 8 + 4],
                        default: heapf32[axis / 4 + i * 8 + 5],
                        max: heapf32[axis / 4 + i * 8 + 6],
                    };
                });
                exports.free(c);
                exports.free(axis);
                return result;
            },

            /**
             * Free the object.
             */
            destroy() {
                exports.hb_face_destroy(ptr);
            },
            free() {
                exports.hb_face_destroy(ptr);
            },
        };
    }

    /**
     * Create an object representing a Harfbuzz font.
     * @param  face An object returned from `createFace`.
     **/
    function createFont(face: ReturnType<typeof createFace>) {
        const ptr = exports.hb_font_create(face.ptr);
        const pathBufferSize = 65536; // should be enough for most glyphs
        const pathBuffer = exports.malloc(pathBufferSize); // permanently allocated

        const nameBufferSize = 256; // should be enough for most glyphs
        const nameBuffer = exports.malloc(nameBufferSize); // permanently allocated

        /**
         * Return a glyph as an SVG path string.
         * @param {number} glyphId ID of the requested glyph in the font.
         **/
        function glyphToPath(glyphId: number) {
            const svgLength = exports.hbjs_glyph_svg(
                ptr,
                glyphId,
                pathBuffer,
                pathBufferSize,
            );
            return svgLength > 0
                ? utf8Decoder.decode(
                      heapu8.subarray(pathBuffer, pathBuffer + svgLength),
                  )
                : '';
        }

        /**
         * Return glyph name.
         * @param {number} glyphId ID of the requested glyph in the font.
         **/
        function glyphName(glyphId: number) {
            exports.hb_font_glyph_to_string(
                ptr,
                glyphId,
                nameBuffer,
                nameBufferSize,
            );
            const array = heapu8.subarray(
                nameBuffer,
                nameBuffer + nameBufferSize,
            );
            return utf8Decoder.decode(array.slice(0, array.indexOf(0)));
        }

        return {
            ptr: ptr,
            glyphName: glyphName,
            glyphToPath: glyphToPath,
            /**
             * Return a glyph as a JSON path string
             * based on format described on https://svgwg.org/specs/paths/#InterfaceSVGPathSegment
             * @param {number} glyphId ID of the requested glyph in the font.
             **/
            glyphToJson(glyphId: number) {
                const path: string = glyphToPath(glyphId);
                return path
                    .replace(/([MLQCZ])/g, '|$1 ')
                    .split('|')
                    .filter(function (x) {
                        return x.length;
                    })
                    .map(function (x) {
                        const row = x.split(/[ ,]/g);
                        return {
                            type: row[0],
                            values: row
                                .slice(1)
                                .filter(function (x) {
                                    return x.length;
                                })
                                .map(function (x) {
                                    return +x;
                                }),
                        };
                    });
            },
            /**
             * Set the font's scale factor, affecting the position values returned from
             * shaping.
             * @param {number} xScale Units to scale in the X dimension.
             * @param {number} yScale Units to scale in the Y dimension.
             **/
            setScale(xScale: number, yScale: number) {
                exports.hb_font_set_scale(ptr, xScale, yScale);
            },
            /**
             * Set the font's letiations.
             * @param {object} letiations Dictionary of letiations to set
             **/
            setletiations(letiations: Record<string, number>) {
                const entries = Object.entries<number>(letiations);
                const lets: number = exports.malloc(8 * entries.length);
                entries.forEach(function (entry, i) {
                    heapu32[lets / 4 + i * 2 + 0] = hb_tag(entry[0]);
                    heapf32[lets / 4 + i * 2 + 1] = entry[1];
                });
                exports.hb_font_set_letiations(ptr, lets, entries.length);
                exports.free(lets);
            },
            /**
             * Free the object.
             */
            destroy() {
                exports.hb_font_destroy(ptr);
            },
        };
    }

    /**
     * Use when you know the input range should be ASCII.
     * Faster than encoding to UTF-8
     **/
    function createAsciiString(text?: string) {
        if (!text) return { ptr: 0, length: 0, free() {} };
        const ptr = exports.malloc(text.length + 1);
        for (let i = 0; i < text.length; ++i) {
            const char = text.charCodeAt(i);
            if (char > 127) throw new Error('Expected ASCII text');
            heapu8[ptr + i] = char;
        }
        heapu8[ptr + text.length] = 0;
        return {
            ptr: ptr,
            length: text.length,
            free() {
                exports.free(ptr);
            },
        };
    }

    function createJsString(text: string) {
        const ptr = exports.malloc(text.length * 2);
        const words = new Uint16Array(exports.memory.buffer, ptr, text.length);
        for (let i = 0; i < words.length; ++i) words[i] = text.charCodeAt(i);
        return {
            ptr: ptr,
            length: words.length,
            free() {
                exports.free(ptr);
            },
        };
    }

    /**
     * Create an object representing a Harfbuzz buffer.
     **/
    function createBuffer() {
        const ptr = exports.hb_buffer_create();

        return {
            ptr: ptr,
            /**
             * Add text to the buffer.
             * @param {string} text Text to be added to the buffer.
             **/
            addText(text: string) {
                const str = createJsString(text);
                exports.hb_buffer_add_utf16(
                    ptr,
                    str.ptr,
                    str.length,
                    0,
                    str.length,
                );
                str.free();
            },
            /**
             * Set buffer script, language and direction.
             *
             * This needs to be done before shaping.
             **/
            guessSegmentProperties() {
                return exports.hb_buffer_guess_segment_properties(ptr);
            },
            /**
             * Set buffer direction explicitly.
             * @param {string} direction: One of "ltr", "rtl", "ttb" or "btt"
             */
            setDirection(dir: 'ltr' | 'rtl' | 'ttb' | 'btt') {
                exports.hb_buffer_set_direction(
                    ptr,
                    {
                        ltr: 4,
                        rtl: 5,
                        ttb: 6,
                        btt: 7,
                    }[dir] || 0,
                );
            },
            /**
             * Set buffer flags explicitly.
             * @param {string[]} flags: A list of strings which may be either:
             * "BOT"
             * "EOT"
             * "PRESERVE_DEFAULT_IGNORABLES"
             * "REMOVE_DEFAULT_IGNORABLES"
             * "DO_NOT_INSERT_DOTTED_CIRCLE"
             * "PRODUCE_UNSAFE_TO_CONCAT"
             */
            setFlags(flags: BufferFlag[]) {
                let flagValue = 0;
                flags.forEach(function (s) {
                    flagValue |= _buffer_flag(s);
                });

                exports.hb_buffer_set_flags(ptr, flagValue);
            },
            /**
             * Set buffer language explicitly.
             * @param {string} language: The buffer language
             */
            setLanguage(language: string) {
                const str = createAsciiString(language);
                exports.hb_buffer_set_language(
                    ptr,
                    exports.hb_language_from_string(str.ptr, -1),
                );
                str.free();
            },
            /**
             * Set buffer script explicitly.
             * @param {string} script: The buffer script
             */
            setScript(script: string) {
                const str = createAsciiString(script);
                exports.hb_buffer_set_script(
                    ptr,
                    exports.hb_script_from_string(str.ptr, -1),
                );
                str.free();
            },

            /**
             * Set the Harfbuzz clustering level.
             *
             * Affects the cluster values returned from shaping.
             * @param {number} level: Clustering level. See the Harfbuzz manual chapter
             * on Clusters.
             **/
            setClusterLevel(level: number) {
                exports.hb_buffer_set_cluster_level(ptr, level);
            },
            /**
             * Return the buffer contents as a JSON object.
             *
             * After shaping, this function will return an array of glyph information
             * objects. Each object will have the following attributes:
             *
             *   - g: The glyph ID
             *   - cl: The cluster ID
             *   - ax: Advance width (width to advance after this glyph is painted)
             *   - ay: Advance height (height to advance after this glyph is painted)
             *   - dx: X displacement (adjustment in X dimension when painting this glyph)
             *   - dy: Y displacement (adjustment in Y dimension when painting this glyph)
             *   - flags: Glyph flags like `HB_GLYPH_FLAG_UNSAFE_TO_BREAK` (0x1)
             **/
            json() {
                const length = exports.hb_buffer_get_length(ptr);
                const result: {
                    g: number;
                    cl: number;
                    ax: number;
                    ay: number;
                    dx: number;
                    dy: number;
                    flags: number;
                }[] = [];
                const infosPtr = exports.hb_buffer_get_glyph_infos(ptr, 0);
                const infosPtr32 = infosPtr / 4;
                const positionsPtr32 =
                    exports.hb_buffer_get_glyph_positions(ptr, 0) / 4;
                const infos = heapu32.subarray(
                    infosPtr32,
                    infosPtr32 + 5 * length,
                );
                const positions = heapi32.subarray(
                    positionsPtr32,
                    positionsPtr32 + 5 * length,
                );
                for (let i = 0; i < length; ++i) {
                    result.push({
                        g: infos[i * 5 + 0],
                        cl: infos[i * 5 + 2],
                        ax: positions[i * 5 + 0],
                        ay: positions[i * 5 + 1],
                        dx: positions[i * 5 + 2],
                        dy: positions[i * 5 + 3],
                        flags: exports.hb_glyph_info_get_glyph_flags(
                            infosPtr + i * 20,
                        ),
                    });
                }
                return result;
            },
            /**
             * Free the object.
             */
            destroy() {
                exports.hb_buffer_destroy(ptr);
            },
        };
    }

    /**
     * Shape a buffer with a given font.
     *
     * This returns nothing, but modifies the buffer.
     *
     * @param {object} font: A font returned from `createFont`
     * @param {object} buffer: A buffer returned from `createBuffer` and suitably
     *   prepared.
     * @param {object} features: (Currently unused).
     */
    function shape(font: HB.Font, buffer: HB.Buffer, features?: string) {
        const featurestr = createAsciiString(features);
        exports.hb_shape(
            font.ptr,
            buffer.ptr,
            featurestr.ptr,
            featurestr.length,
        );
        featurestr.free();
    }

    /**
    * Shape a buffer with a given font, returning a JSON trace of the shaping process.
    *
    * This function supports "partial shaping", where the shaping process is
    * terminated after a given lookup ID is reached. If the user requests the function
    * to terminate shaping after an ID in the GSUB phase, GPOS table lookups will be
    * processed as normal.
    *
    * @param {object} font: A font returned from `createFont`
    * @param {object} buffer: A buffer returned from `createBuffer` and suitably
    *   prepared.
    * @param {string} features: A dictionary of OpenType features to apply.
    * @param {number} stop_at: A lookup ID at which to terminate shaping.
    * @param {number} stop_phase: Either 0 (don't terminate shaping), 1 (`stop_at`
        refers to a lookup ID in the GSUB table), 2 (`stop_at` refers to a lookup
        ID in the GPOS table).
    */

    function shapeWithTrace(
        font: ReturnType<typeof createFont>,
        buffer: ReturnType<typeof createFont>,
        features: string,
        stop_at: number,
        stop_phase: number,
    ) {
        const bufLen = 1024 * 1024;
        const traceBuffer = exports.malloc(bufLen);
        const featurestr = createAsciiString(features);
        const traceLen = exports.hbjs_shape_with_trace(
            font.ptr,
            buffer.ptr,
            featurestr.ptr,
            stop_at,
            stop_phase,
            traceBuffer,
            bufLen,
        );
        featurestr.free();
        const trace = utf8Decoder.decode(
            heapu8.subarray(traceBuffer, traceBuffer + traceLen - 1),
        );
        exports.free(traceBuffer);
        return JSON.parse(trace);
    }

    /** 附加 API */
    function createSubset(
        face: ReturnType<typeof createFace>,
        preserveNameIds?: number[],
        variationAxes?: Record<string, number>,
    ) {
        const ptr = exports.hb_subset_input_create_or_fail();
        if (ptr === 0) {
            throw new Error(
                'hb_subset_input_create_or_fail (harfbuzz) returned zero, indicating failure',
            );
        }

        let resultPtr: number;
        const inputUnicodePtr = exports.hb_subset_input_unicode_set(ptr);
        return {
            ptr,
            clearTableDrop() {
                exports.hb_set_clear(
                    exports.hb_subset_input_set(
                        ptr,
                        3 /**HB_SUBSET_SETS_DROP_TABLE_TAG */,
                    ),
                );
            },
            adjustLayout() {
                for (const iterator of [6, 7]) {
                    // Do the equivalent of --font-features=*
                    const layoutFeatures = exports.hb_subset_input_set(
                        ptr,
                        iterator,
                    );
                    exports.hb_set_clear(layoutFeatures);
                    exports.hb_set_invert(layoutFeatures);
                }

                if (preserveNameIds) {
                    const inputNameIds = exports.hb_subset_input_set(
                        ptr,
                        4, // HB_SUBSET_SETS_NAME_ID
                    );
                    for (const nameId of preserveNameIds) {
                        exports.hb_set_add(inputNameIds, nameId);
                    }
                }
                if (variationAxes) {
                    for (const [axisName, value] of Object.entries(
                        variationAxes,
                    )) {
                        exports.hb_subset_input_pin_axis_location(
                            ptr,
                            face.ptr,
                            HB_TAG(axisName),
                            value,
                        );
                    }
                }
            },
            deleteChar(arr: number[]) {
                for (const c of arr) {
                    exports.hb_set_del(inputUnicodePtr, c);
                }
            },
            addChars(arr: (number | [number, number])[]) {
                for (const c of arr) {
                    if (c instanceof Array) {
                        const [start, end] = c;
                        for (let ptr = start; ptr <= end; ptr++) {
                            exports.hb_set_add(inputUnicodePtr, ptr);
                        }
                    } else {
                        exports.hb_set_add(inputUnicodePtr, c);
                    }
                }
            },
            getResult() {
                return resultPtr;
            },
            runSubset() {
                resultPtr = exports.hb_subset_or_fail(face.ptr, ptr);
                if (resultPtr === 0) {
                    throw new Error(
                        'hb_subset_or_fail (harfbuzz) returned zero, indicating failure. Maybe the input file is corrupted?',
                    );
                }
                return resultPtr;
            },
            destroy() {
                if (resultPtr && typeof resultPtr === 'number')
                    exports.hb_face_destroy(resultPtr);
                exports.hb_subset_input_destroy(ptr);
            },

            toBinary() {
                const blobPtr = exports.hb_face_reference_blob(resultPtr);
                const offset = exports.hb_blob_get_data(blobPtr, 0);
                const subsetByteLength = exports.hb_blob_get_length(blobPtr);

                if (subsetByteLength === 0) {
                    exports.hb_blob_destroy(blobPtr);
                    throw new Error(
                        'Failed to create subset font, maybe the input file is corrupted?',
                    );
                }

                return {
                    destroy() {
                        exports.hb_blob_destroy(blobPtr);
                    },
                    offset,
                    subsetByteLength,
                    blobPtr,
                    data: () =>
                        heapu8.subarray(offset, offset + subsetByteLength),
                };
            },
        };
    }

    return {
        createSubset,
        createBlob,
        createFace,
        createFont,
        createBuffer,
        shape,
        shapeWithTrace,
        exports,
        heapu8,
        heapf32,
        heapi32,
        heapu32,
        typedArrayFromSet,
        collectUnicodes,
    };
}
