import { FontEditor, TTF } from "fonteditor-core";

export const FontHeaders = (font: FontEditor.Font, meta: TTF.TTFObject) => {
    return meta.name;
};
