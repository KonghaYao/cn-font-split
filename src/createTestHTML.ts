import path from "path";
import fse from "fs-extra";
import template from "./template.html";
export async function createTestHTML({ destFold }: { destFold: string }) {
    const indexHTML = Buffer.from(template, "base64").toString("utf-8");
    return fse.outputFile(path.join(destFold, "index.html"), indexHTML);
}
