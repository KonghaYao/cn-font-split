export const isJsDom =
    typeof navigator === "object" &&
    navigator.userAgent &&
    navigator.userAgent.includes("jsdom");
export const isNode =
    typeof globalThis.process === "object" &&
    !!globalThis.process.versions &&
    !!globalThis.process.versions.node;
export const isBrowser =
    typeof window === "object" &&
    typeof document === "object" &&
    document.nodeType === 9;
const Deno = globalThis.Deno;

export const isDeno = typeof Deno === "object" && Deno.version;
