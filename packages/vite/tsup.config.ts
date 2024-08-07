import type { Options } from 'tsup';

export default <Options>{
    entryPoints: ['src/unplugin.ts', 'src/nuxt.ts'],
    clean: true,
    format: ['cjs', 'esm'],
    dts: true,
    cjsInterop: true,
    splitting: true,
    sourcemap: true,
};
