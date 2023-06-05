import { convert } from "../dist";

export const TransFontsToTTF = (buffer: Buffer) => {
    return convert(buffer, "truetype");
};
