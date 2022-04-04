import path, { resolve } from "path";
import fse from "fs-extra";
export async function createTestHTML({
    fontFamily,
    cssFileName,
    destFold,
}: {
    fontFamily: string;
    cssFileName: string;
    destFold: string;
}) {
    const template = await fse.readFile(resolve(__dirname, "./template.html"), {
        encoding: "utf-8",
    });
    const indexHTML = template
        .replace("testFontName", fontFamily)
        .replace("FONTCSSNAME", cssFileName);
    return fse.outputFile(path.join(destFold, "index.html"), indexHTML);
}
