import { fontSplit } from "../../dist/index.js";

import { expose } from "threads/worker";
expose({
    fontSplit,
});
