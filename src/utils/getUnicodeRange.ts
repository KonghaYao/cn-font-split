import codePoints from "code-points";

export function getUnicodeRangeArray(str: string): number[] {
    return codePoints(str);
}
