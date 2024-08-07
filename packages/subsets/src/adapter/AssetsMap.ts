import { resolveNodeModule } from '../utils/resolveNodeModule';
import { isBrowser, isDeno, isInWorker, isNode } from '../utils/env';
import type { IOutputFile } from '../interface';

/** 统一管理各个平台下面的资源加载的类 */
class AssetsMap<K extends string> extends Map<K, string> {
    constructor(input: { [key in K]: string } | [K, string][]) {
        super(
            input instanceof Array
                ? input
                : (Object.entries(input) as [K, string][]),
        );
    }
    /**
     * 确保获取到一个短路径。
     * 如果给定的token对应的路径已存在，则返回这个路径。如果不存在，则直接返回token。
     * 这个方法允许通过一个键或字符串直接获取路径，如果存在转换函数，则会对路径进行转换。
     *
     * @param token - 一个键值或字符串，用于查找或直接使用。
     * @returns 如果token对应的路径存在，则返回转换后的路径；如果不存在，则返回token本身。
     */
    ensureGet(token: K | string) {
        let shortPath;
        // 检查给定的token是否存在于集合中
        if (this.has(token as K)) {
            // 获取token对应的短路径
            shortPath = this.get(token as K) as string;
            // 如果存在路径转换函数，则对短路径进行转换
            if (this.pathTransform) {
                return this.pathTransform(shortPath);
            } else {
                // 如果没有路径转换函数，直接返回短路径
                return shortPath;
            }
        } else {
            // 如果token不存在于集合中，直接返回token
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
            const realFilePath = await resolveNodeModule(targetPath);
            return readFile(realFilePath).then((res) => {
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

    /** 以 fetch 的方式进行数据传递 */
    async loadFileResponse(token: K | string): Promise<Response> {
        if (!globalThis.fetch) {
            throw new Error(
                'fetch 函数不存在，请适配 fetch 或者升级更高级的 Nodejs ',
            );
        }

        return fetch(new URL(this.ensureGet(token), import.meta.url));
    }
    /**
     * 在浏览器等使用情况下，assets 都放置在一个路径下，所以可以使用此属性直接设置 root,
     * @env node 对于 node 环境用处不大
     */
    public pathTransform?: (innerPath: string) => string;
    /** 重新设定内部的数据 */
    redefine(input: { [key in K]: string } | [K, string][]) {
        if (input instanceof Array) {
            input.map(([k, v]) => this.set(k, v));
        } else {
            Object.entries(input).map(([k, v]) =>
                this.set(k as K, v as string),
            );
        }
    }
    /** 对外输出文件 */
    outputFile: IOutputFile = async (file, data, options) => {
        if (isNode) {
            const outputFile = (await import('fs-extra')).outputFile;
            return outputFile(file, data, options);
        }
        //ifdef browser
        if (isDeno) {
            const { outputFile } = await import('./deno/fs-extra');
            return outputFile(file, data);
        }
        //endif
        throw new Error(
            '你的环境好像不支持内部的 outputFile，请你适配 outputFile 参数',
        );
    };
}

/** 管理系统资源加载的类 */
export class SystemAssetsMap<K extends string> extends AssetsMap<K> {
    async loadHarbuzz(input = 'hb-subset.wasm') {
        if (isNode || isDeno) {
            const blob = await this.loadFileAsync(input);
            return WebAssembly.instantiate(blob);
        }
        return WebAssembly.instantiateStreaming(this.loadFileResponse(input));
    }
}
