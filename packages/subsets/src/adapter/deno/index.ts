import { isDeno } from "../../utils/env";
export * from "./fs-extra";
export const DenoAdapter = async () => {
    isDeno && (await import("./shim"));
};
