import { expose } from "threads/worker";
import path from "path";
import { nanoid } from "nanoid";
import { CutFont } from "./utils/FontUtils.js";
import fse from "fs-extra";
expose(async function genFontFile(file, subset, destFold) {
    console.log(file.length);
    const id = nanoid();
    const font = await CutFont(file, subset);

    const Path = path.join(destFold, id + ".woff2");
    await fse.outputFile(Path, font);

    return { id, subset, size: font.length };
});
