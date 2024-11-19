import { hbjs } from '../../subsets/src/hb.js';
import { Font2SVGOptions, makeImage } from './makeImage.js';
import wrapper from '@konghayao/harfbuzzjs/hb.js';

export const font2svg = async (
    ttfFile: Uint8Array,
    text: string,
    options?: Font2SVGOptions,
) => {
    const hb = hbjs(await wrapper());
    const blob = hb.createBlob(ttfFile);
    const face = hb.createFace(blob, 0);
    blob.destroy();
    const font = hb.createFont(face);
    return makeImage(hb, font, text, options);
};
