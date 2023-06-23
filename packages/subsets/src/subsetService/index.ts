import { HB } from "../hb";

import { Subset } from "src/interface";
export interface SubsetFontOptions {
    variationAxes?: Record<number, number>;
    preserveNameIds?: number[];
    threads?:
        | false
        | {
              service?: null;
          };
}
export type ISubsetFont = (
    face: HB.Face,
    subsetUnicode: Subset,
    hb: HB.Handle,
    options: SubsetFontOptions
) => Promise<readonly [Uint8Array | null, Uint32Array]>;
