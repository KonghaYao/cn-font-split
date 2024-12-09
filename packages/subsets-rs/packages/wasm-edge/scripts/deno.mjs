import { fontSplit, StaticWasm } from 'https://esm.sh/cn-font-split-wasm@1.3.0';
import {
    BlobReader,
    BlobWriter,
    ZipWriter,
} from "https://deno.land/x/zipjs/index.js";

const wasm = new StaticWasm(
    'https://ik.imagekit.io/github/KonghaYao/cn-font-split/releases/download/7.0.0-beta-1/cn-font-split-7.0.0-beta-1-wasm32-wasi.Oz.wasm',
);
await wasm.wasmBuffer;
Deno.serve(
    /**
     * 处理请求并使用 WebAssembly 进行字体拆分
     * @async
     * @param {Request} req - 请求对象
     * @returns {Promise<Response>} 返回 zip 文件
     */
    async (req) => {
        if (req.method.toLowerCase() === "post") {
            const input = await req.arrayBuffer()

            const data = await fontSplit(
                {
                    input: new Uint8Array(input),
                },
                wasm.WasiHandle,
                {
                    logger(str, type) {
                        // console.log(str);
                    },
                },
            );
            console.time("compress")
            // Creates a BlobWriter object where the zip content will be written.
            const zipFileWriter = new BlobWriter();
            const zipWriter = new ZipWriter(zipFileWriter);
            for (const item of data) {

                await zipWriter.add(item.name, new BlobReader(new Blob([item.data])));
            }
            await zipWriter.close();
            const zipFileBlob = await zipFileWriter.getData();
            console.timeEnd("compress")
            return new Response(
                zipFileBlob,
                {
                    headers: {
                        "content-type": "application/octet-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive"
                    }
                }
            )
        }
        return new Response("请使用 post 请求")
    }
)