import { woff2 } from "fonteditor-core";
export async function initWoff2() {
    await woff2.init("../../node_modules/fonteditor-core/woff2/woff2.wasm");
}
