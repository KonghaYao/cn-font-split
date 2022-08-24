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
    const indexHTML = Buffer.from(template, "base64")
        .toString("utf-8")
        .replace("testFontName", fontFamily)
        .replace(/FONTCSSNAME/g, cssFileName);
    return fse.outputFile(path.join(destFold, "index.html"), indexHTML);
}
