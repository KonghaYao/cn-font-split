import getUnicodeRange from "./utils/getUnicodeRange.js";
import { v4 } from "uuid";
import Fontmin from "fontmin";
export default function genFontFile({
    text,
    FontPath,
    css: {
        fontStyle = "normal",
        fontWeight = "normal",
        fontDisplay = "swap",
        fontFamily = null,
    } = {},
}) {
    return new Promise((resolve) => {
        new Fontmin()
            .src(FontPath)
            .use(
                Fontmin.glyph({
                    trim: true,
                    hint: true,
                    text,
                })
            )
            .run(function (err, files) {
                if (err) {
                    throw err;
                }
                const fileName = v4();
                let returnFontName = "";
                const style = files.map((file) => {
                    const localFontFamily = file.ttfObject.name.fullName;
                    returnFontName = localFontFamily;
                    return `@font-face {
    font-family: ${fontFamily || localFontFamily};
    src: url("./${fileName}.ttf") format("truetype");
    font-style: ${fontStyle};
    font-weight: ${fontWeight};
    font-display: ${fontDisplay};
    unicode-range:${getUnicodeRange(text).join(",")}
}`;
                });
                resolve({
                    style,
                    file: files[0],
                    fileName,
                    fontFamily: returnFontName,
                });
            });
    });
}
