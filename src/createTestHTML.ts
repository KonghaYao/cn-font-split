import path, { resolve } from "path";
import fse from "fs-extra";
import template from "./template.html";
export async function createTestHTML({
    fontFamily,
    cssFileName,
    destFold,
}: {
    fontFamily: string;
    cssFileName: string;
    destFold: string;
}) {
    const indexHTML = template
        .replace("testFontName", fontFamily)
        .replace("FONTCSSNAME", cssFileName);
    return fse.outputFile(path.join(destFold, "index.html"), indexHTML);
}
