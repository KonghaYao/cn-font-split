import fse from "fs-extra";
import path from "path";
import { Image } from "imagescript";
export const createImageForFont = async (
    buffer: Buffer,
    destFold: string,
    {
        text = "中文网字计划\nThe Project For Web",
        name = "preview",
    }: { text?: string; name?: string }
) => {
    const font = await Image.renderText(buffer, 128, text);
    const encoded = await font.encode(1, {
        creationTime: Date.now(),
        software: "中文网字计划",
        author: "江夏尧",
        description: "中文网字计划 切割字体预览图",
    });

    await fse.outputFile(path.join(destFold, "preview" + ".png"), encoded);
};
