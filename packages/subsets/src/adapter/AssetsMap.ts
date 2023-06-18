import type { ReadStream } from "fs-extra";
import { resolveNodeModule } from "../utils/resolveNodeModule";
export class AssetsMap<K extends string> extends Map<K, string> {
    constructor(input: { [key in K]: string } | [K, string][]) {
        if (input instanceof Array) {
            super(input);
        } else {
            super(Object.entries(input) as [K, string][]);
        }
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
        const { readFile } = await import("node:fs/promises");
        return readFile(await resolveNodeModule(this.ensureGet(token)));
    }

    async loadFileStream(
        token: K | string
    ): Promise<ReadableStream | ReadStream> {
        const { createReadStream } = await import("fs-extra");
        return createReadStream(this.ensureGet(token));
    }
    /** 以 fetch 的方式进行数据传递 */
    async loadFileResponse(token: K | string): Promise<Response> {
        return fetch(this.ensureGet(token));
    }
}
