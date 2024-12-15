import { fontSplit, StaticWasm } from '../../dist/wasm/index';
const input = await fetch(
    'https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf',
).then((res) => res.arrayBuffer());

const wasm = new StaticWasm(
    'https://ik.imagekit.io/github/KonghaYao/cn-font-split/releases/download/7.0.0-beta-4/libffi-wasm32-wasip1.wasm',
);

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
