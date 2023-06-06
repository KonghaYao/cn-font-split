export const isJsDom =
    typeof navigator === "object" &&
    navigator.userAgent &&
    navigator.userAgent.includes("jsdom");
export const isNode =
    typeof process === "object" &&
    !!process.versions &&
    !!process.versions.node;
export const isBrowser =
    typeof window === "object" &&
    typeof document === "object" &&
    document.nodeType === 9;
