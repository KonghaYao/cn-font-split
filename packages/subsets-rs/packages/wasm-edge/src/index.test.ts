import { fontSplit, StaticWasm } from './index';
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());

const wasm = new StaticWasm('./target/wasm32-wasip1/release/wasm_edge.wasm');

const data = await fontSplit(
    {
        input: new Uint8Array(input),
    },
    wasm.WasiHandle,
    {
        logger(str, type) {
            console.log(str);
        },
    },
);

console.log(data);
// { name: string, data: Uint8Array }[]
