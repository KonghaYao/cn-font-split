export const loadHarfbuzz = (source: Buffer) => {
    return WebAssembly.instantiate(source);
};
