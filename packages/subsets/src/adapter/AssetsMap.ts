import type { ReadStream } from "fs-extra";
import { resolveNodeModule } from "../utils/resolveNodeModule";
import { isBrowser, isDeno, isNode } from "../utils/env";
import { Buffer } from "buffer";
import type { IOutputFile } from "src/interface";
export class AssetsMap<K extends string> extends Map<K, string> {
    constructor(input: { [key in K]: string } | [K, string][]) {
        super(
            input instanceof Array
                ? input
                : (Object.entries(input) as [K, string][])
        );
    }
    ensureGet(token: K | string) {
        if (this.has(token as K)) {
            return this.get(token as K)!;
        } else {
            return token;
        }
    }
    /** 异步地导入本地数据 */
    async loadFileAsync(token: K | string): Promise<Buffer> {
        if (isNode) {
            const { readFile } = await import("node:fs/promises");
            return readFile(await resolveNodeModule(this.ensureGet(token)));
        } else if (isBrowser) {
            return this.loadFileResponse(token)
                .then((res) => res.arrayBuffer())
                .then((res) => Buffer.from(res));
        } else if (isDeno) {
            return Deno.readFile(this.ensureGet(token)).then((res) =>
                Buffer.from(res)
            );
        }
        throw new Error("loadFileAsync 适配环境失败");
    }

    async loadFileStream(
        token: K | string
    ): Promise<ReadableStream | ReadStream> {
        const { createReadStream } = await import("fs-extra");
        return createReadStream(this.ensureGet(token));
    }
    /** 以 fetch 的方式进行数据传递 */
    async loadFileResponse(token: K | string): Promise<Response> {
        if (!globalThis.fetch) {
            throw new Error(
                " fetch 函数不存在，请升级更高级的 Nodejs 或者其它环境"
            );
        }

        return fetch(new URL(this.ensureGet(token), import.meta.url));
    }
    redefine(input: { [key in K]: string } | [K, string][]) {
        if (input instanceof Array) {
            input.map(([k, v]) => this.set(k, v));
        } else {
            Object.entries(input).map(([k, v]) =>
                this.set(k as K, v as string)
            );
        }
    }
    outputFile: IOutputFile = async (file, data, options) => {
        if (isNode) {
            const outputFile = (await import("fs-extra")).outputFile;
            await outputFile(file, data, options);
        }
        if (isDeno) {
            const { outputFile } = await import("./deno/fs-extra");
            await outputFile(file, data);
        }
    };
}
