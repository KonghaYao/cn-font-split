import fs from "fs/promises";
import { convert, hbjs, subsetFont } from "../dist/index.js";

const buffer = await fs.readFile(
    "./node_modules/@konghayao/harfbuzzjs/hb-subset.wasm"
);
const fontBuffer = await fs.readFile("../../fonts/SourceHanSerifCN-Light.otf");
const source = await WebAssembly.instantiate(buffer);

const Buffer = await subsetFont(
    await convert(fontBuffer, "truetype"),
    "hello中国",
    hbjs(source.instance),
    {
        targetFormat: "sfnt",
    }
);

fs.writeFile("./temp/test.otf", Buffer);
