import { HB } from "../hb";

import { wrap, Remote } from "comlink";
import type { SubsetAPI } from "./subset.worker";
import { Subset } from "src/interface";
export interface SubsetFontOptions {
    variationAxes?: Record<number, number>;
    preserveNameIds?: number[];
    threads?: false | {};
}
export type ISubsetFont = (
    face: HB.Face,
    subsetUnicode: Subset,
    hb: HB.Handle,
    options: SubsetFontOptions
) => Promise<readonly [Uint8Array | null, Uint32Array]>;

export class SubsetService {
    workers: Remote<SubsetAPI>[] = [];
    async createWorker() {
        const { default: w } = await import("web-worker:./subset.worker");
        const api = wrap<SubsetAPI>(new w());
        this.workers.push(api);
    }
    // TODO 请完成多线程池的管理
    run<T>(handle: (api: SubsetAPI) => Promise<T>): Promise<T> {}
    subsetFont: ISubsetFont = async (face, unicode, hb, options) => {
        return this.run(async (api) =>
            api.subsetFont(
                unicode,
                JSON.parse(JSON.stringify(options)) as SubsetFontOptions
            )
        );
    };
}
