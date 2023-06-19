import { isDeno } from "../../utils/env";

isDeno &&
    /** @ts-ignore */
    (globalThis.location = {
        origin: "/",
        /** @ts-ignore */
        toString() {
            return;
        },
    });
