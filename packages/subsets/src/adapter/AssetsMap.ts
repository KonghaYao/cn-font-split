import type { ReadStream } from 'fs-extra';
import { resolveNodeModule } from '../utils/resolveNodeModule';
import { isBrowser, isDeno, isInWorker, isNode } from '../utils/env';
import type { IOutputFile } from 'src/interface';
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
            return this.get(token as K) as string;
        } else {
            return token;
        }
    }
    /** 异步地导入本地数据 */
    async loadFileAsync(token: K | string): Promise<Uint8Array> {
        const targetPath = this.ensureGet(token);
        if (isNode) {
            const {
                promises: { readFile },
            } = await import('fs');
            return readFile(await resolveNodeModule(targetPath)).then((res) => {
                return new Uint8Array(res.buffer);
            });
        } else if (
            isBrowser ||
            isInWorker ||
            ['https://', 'http://'].some((i) => targetPath.startsWith(i))
        ) {
            return this.loadFileResponse(token)
                .then((res) => res.arrayBuffer())
                .then((res) => new Uint8Array(res));
        } else if (isDeno) {
            return Deno.readFile(targetPath);
        }
        throw new Error('loadFileAsync 适配环境失败');
    }

    async loadFileStream(
        token: K | string
    ): Promise<ReadableStream | ReadStream> {
        const { createReadStream } = await import('fs-extra');
        return createReadStream(this.ensureGet(token));
    }
    /** 以 fetch 的方式进行数据传递 */
    async loadFileResponse(token: K | string): Promise<Response> {
        if (!globalThis.fetch) {
            throw new Error(
                'fetch 函数不存在，请适配 fetch 或者升级更高级的 Nodejs '
            );
        }

        return fetch(new URL(this.ensureGet(token), import.meta.url));
    }
    /** 重新设定内部的数据 */
    redefine(input: { [key in K]: string } | [K, string][]) {
        if (input instanceof Array) {
            input.map(([k, v]) => this.set(k, v));
        } else {
            Object.entries(input).map(([k, v]) =>
                this.set(k as K, v as string)
            );
        }
    }
    /** 对外输出文件 */
    outputFile: IOutputFile = async (file, data, options) => {
        if (isNode) {
            const outputFile = (await import('fs-extra')).outputFile;
            return outputFile(file, data, options);
        }
        if (isDeno) {
            const { outputFile } = await import('./deno/fs-extra');
            return outputFile(file, data);
        }
        throw new Error(
            '你的环境好像不支持内部的 outputFile，请你适配 outputFile 参数'
        );
    };
}
