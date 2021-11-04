import __dirname from "./__dirname.js";
import path, { resolve } from "path";
import fse from "fs-extra";
export default async function ({ fontFamily, cssFileName, destFold }) {
    const template = await fse.readFile(resolve(__dirname, "./template.html"), {
        encoding: "utf-8",
    });
    const indexHTML = template
        .replace("testFontName", fontFamily)
        .replace("FONTCSSNAME", cssFileName);
    return fse.outputFile(path.join(destFold, "index.html"), indexHTML);
}
