import { HB, hbjs } from "../hb";
import { subsetFont, subsetFontSimple } from "./subsetFont";
import { loadHarbuzzAdapter } from "../adapter/loadHarfbuzz";
import { expose, transfer } from "comlink";
//ifdef node
import nodeEndpoint from "comlink/dist/esm/node-adapter.mjs";
import { parentPort } from "worker_threads";
//endif
import { SubsetFontOptions } from "./index";
export class SubsetAPI {
    private destroy() {
        this.face?.destroy();
    }
    state = "idle";
    p = Promise.resolve();
    async init(ttfFile: Uint8Array) {
        if (this.state !== "init") {
            this.state = "init";
            this.destroy();

            let wasm = await loadHarbuzzAdapter();
            const hb = hbjs(wasm!.instance);
            this.hb = hb;
            const blob = hb.createBlob(ttfFile);
            const face = hb.createFace(blob, 0);
            this.face = face;
            blob.destroy();
            this.state = "running";
        }
    }
    hb!: HB.Handle;
    face!: HB.Face;
    subsetFont = (
        subsetUnicode: (number | [number, number])[],
        options: SubsetFontOptions = {}
    ) => {
        if (this.state !== "running") return false;
        const [a, b] = subsetFontSimple(
            this.face,
            subsetUnicode,
            this.hb,
            options
        );

        return transfer([a, b], a ? [a.buffer, b.buffer] : [b.buffer]);
        // return a ? transfer(a, [a?.buffer]) : null;
    };
}
const api = new SubsetAPI();
expose(
    {
        init: api.init.bind(api),
        subsetFont: api.subsetFont.bind(api),
    },
    //ifdef node
    nodeEndpoint(parentPort!)
    //endif
);
