import { fontSplit } from './index';
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());
fontSplit(
    {
        input: new Uint8Array(input),
    },
    (imports) =>
        WebAssembly.instantiateStreaming(
            fetch('./target/wasm32-wasip1/release/wasm_edge.wasm'),
            // './target/wasm32-wasip1/release/wasm_edge.Oz.wasm',
            imports as any,
        ),
    {
        logger(str, type) {
            console.log(str);
        },
    },
).then((res) => {
    console.log(res);
});
