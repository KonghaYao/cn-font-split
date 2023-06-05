import fs from "fs/promises";
import { hbjs } from "../dist/index.js";

const buffer = await fs.readFile(
    "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
);
const source = await WebAssembly.instantiate(buffer);
const api = hbjs(source.instance);
const blob = api.createBlob(
    await fs.readFile("../../fonts/SourceHanSerifCN-Light.otf")
);
const face = api.createFace(blob);
const res = face.collectUnicodes();
console.log(res);
