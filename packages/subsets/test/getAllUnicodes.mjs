import fs from "fs/promises";
import { hbjs, decodeNameTableFromUint8Array } from "../dist/index.js";
import { Font } from "fonteditor-core";
// import Reader from "fonteditor-core/src/ttf/table/ttfreader.js";

const wasmBuffer = await fs.readFile(
    "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
);
const source = await WebAssembly.instantiate(wasmBuffer);
const api = hbjs(source.instance);
const buffer = await fs.readFile("../../fonts/SourceHanSerifCN-Light.otf");
const blob = api.createBlob(buffer);
const face = api.createFace(blob);
const res = face.reference_table("name");

console.log(decodeNameTableFromUint8Array(res));
// const font = Font.create(buffer, {
//     // support ttf, woff, woff2, eot, otf, svg
//     type: "otf",
//     // only read `a`, `b` glyphs
//     subset: [65, 66],
//     // save font hinting
//     hinting: true,
//     // transform ttf compound glyph to simple
//     compound2simple: true,
//     // inflate function for woff
//     inflate: null,
//     // for svg path
//     combinePath: false,
// });
// console.log(font.get()["name"]);
