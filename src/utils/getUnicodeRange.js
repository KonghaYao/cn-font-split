import codePoints from "code-points";

export function getUnicodeRangeArray(str) {
    return codePoints(str);
}
