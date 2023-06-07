/**
 * Unicode Platform-specific Encoding Identifiers
 */
// mac encoding id
export const mac = {
    Default: 0,
    "Version1.1": 1,
    ISO10646: 2,
    UnicodeBMP: 3,
    UnicodenonBMP: 4,
    UnicodeVariationSequences: 5,
    FullUnicodecoverage: 6,
};
// windows encoding id
export const win = {
    Symbol: 0,
    UCS2: 1,
    ShiftJIS: 2,
    PRC: 3,
    BigFive: 4,
    Johab: 5,
    UCS4: 6,
};
export const platformTbl = {
    Unicode: 0,
    Macintosh: 1,
    mac: 1,
    reserved: 2,
    Microsoft: 3,
    win: 3,
};
