import { HB, hbjs } from "../hb";
import { subsetFont, subsetFontSimple } from "./subsetFont";
import { loadHarbuzzAdapter } from "../adapter/loadHarfbuzz";
import { expose, transfer } from "comlink";
import { SubsetFontOptions } from "./index";
export class SubsetAPI {
    private destroy() {
        this.face?.destroy();
    }
    async init(ttfFile: Uint8Array) {
        this.destroy();
        let wasm = await loadHarbuzzAdapter();
        const hb = hbjs(wasm!.instance);
        this.hb = hb;
        const blob = hb.createBlob(ttfFile);
        const face = hb.createFace(blob, 0);
        this.face = face;
        blob.destroy();
    }
    hb!: HB.Handle;
    face!: HB.Face;
    subsetFont = (
        subsetUnicode: (number | [number, number])[],
        options: SubsetFontOptions = {}
    ) => {
        const [a, b] = subsetFontSimple(
            this.face,
            subsetUnicode,
            this.hb,
            options
        );
        return [
            a ? transfer(a, [a.buffer]) : a,
            transfer(b, [b.buffer]),
        ] as const;
    };
}
expose(new SubsetAPI());
