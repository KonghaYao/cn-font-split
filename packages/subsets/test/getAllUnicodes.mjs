import fs from "fs/promises";
import { hbjs, autoSubset } from "../dist/index.js";
import { Font } from "fonteditor-core";
// import Reader from "fonteditor-core/src/ttf/table/ttfreader.js";

const wasmBuffer = await fs.readFile(
    "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
);
const source = await WebAssembly.instantiate(wasmBuffer);
const api = hbjs(source.instance);
// const buffer = await fs.readFile("../../fonts/SourceHanSerifCN-Light.otf");
const buffer = await fs.readFile("../../fonts/SmileySans-Oblique.ttf");
const blob = api.createBlob(buffer);
const face = api.createFace(blob);
const arr = face.collectUnicodes().slice(0, 2001);
console.log(arr.length);
const res = autoSubset(face, arr, api);
