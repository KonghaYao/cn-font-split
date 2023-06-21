import { isDeno } from "../../utils/env";
try {
    isDeno &&
        /** @ts-ignore */
        (globalThis.location = {
            origin: "/",
            /** @ts-ignore */
            toString() {
                return;
            },
        });
} catch (e) {}
