import path from "path";
import fse from "fs-extra";
import template from "./template.html";
import { Buffer } from "buffer";
export async function createTestHTML({
    destFold,
    outputFile,
}: {
    destFold: string;
    outputFile: (
        file: string,
        data: any,
        options?: string | fse.WriteFileOptions | undefined
    ) => Promise<void>;
}) {
    const indexHTML = Buffer.from(template, "base64").toString("utf-8");
    return outputFile(path.join(destFold, "index.html"), indexHTML);
}
