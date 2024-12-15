import { fontSplit, StaticWasm } from '../dist/wasm/index.js';
import {
    BlobReader,
    BlobWriter,
    ZipWriter,
} from 'https://deno.land/x/zipjs/index.js';

const wasm = new StaticWasm(
    // 静态加载保证冷启动性能
    new URL('../dist/libffi-wasm32-wasip1.wasm', import.meta.url),
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
        const url = new URL(req.url);
        const isProtoBinary = url.pathname.startsWith('/protobuf');
        if (req.method.toLowerCase() === 'post') {
            const input = await req.arrayBuffer();
            const data = await fontSplit(
                isProtoBinary
                    ? input
                    : {
                          input: new Uint8Array(input),
                      },
                wasm.WasiHandle,
                {
                    logger(str, type) {
                        // console.log(str);
                    },
                },
            );
            console.time('compress');
            // Creates a BlobWriter object where the zip content will be written.
            const zipFileWriter = new BlobWriter();
            const zipWriter = new ZipWriter(zipFileWriter);
            for (const item of data) {
                await zipWriter.add(
                    item.name,
                    new BlobReader(new Blob([item.data])),
                );
            }
            await zipWriter.close();
            const zipFileBlob = await zipFileWriter.getData();
            const file = await zipFileBlob.arrayBuffer();
            console.timeEnd('compress');
            const key = crypto.randomUUID().replaceAll('-', '') + '.zip';
            const formData = new FormData();
            formData.append('file', new Blob([new Uint8Array(file)]), key); // 将文件添加到表单数据中
            const url = await fetch('https://temp.sh/upload', {
                method: 'POST',
                body: formData,
            }).then((res) => res.text());
            return new Response(url);
        }
        return new Response('请使用 post 请求');
    },
);
