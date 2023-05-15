import fse from "fs-extra";
import path from "path";
import { Image } from "imagescript";
import { defaultOutputFile } from "./default";
export const woff2ToTTF = async (font: Buffer) => {
    const { default: woff2Rs } = await import("@woff2/woff2-rs");
    return woff2Rs.decode(font); // output TTF buffer
};

export const createImageForFont = async (
    buffer: Buffer,
    type: string,
    destFold: string,
    {
        text = "中文网字计划\nThe Project For Web",
        name = "preview",
        outputFile = defaultOutputFile,
    }: {
        text?: string;
        name?: string;
        outputFile?: (
            file: string,
            data: any,
            options?: string | fse.WriteFileOptions | undefined
        ) => Promise<void>;
    }
) => {
    if (type !== "ttf") {
        buffer = await woff2ToTTF(buffer);
    }

    const Font = await Image.renderText(buffer, 128, text);
    const encoded = await Font.encode(1, {
        creationTime: Date.now(),
        software: "中文网字计划",
        author: "江夏尧",
        description: "中文网字计划 切割字体预览图",
    });

    await outputFile(path.join(destFold, "preview" + ".png"), encoded);
};
