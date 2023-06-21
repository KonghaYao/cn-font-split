import SplitWorker from "./index?worker";

import { wrap } from "comlink";
export const SplitWorkerAPI = wrap<{
    fontSplit: typeof import("@konghayao/cn-font-split")["fontSplit"];
}>(new SplitWorker());
