import {
    GetObjectCommand,
    PutObjectCommand
} from '@aws-sdk/client-s3';
import { sha256 } from './sha256.js';
import { fontSplit } from './cn-font-split/index.js';
import { FontCSSAPI } from './index.js';

export class BuilderAPI extends FontCSSAPI {
    // 挂载 woff2 服务，当有时，使用这个服务；无时，使用本地多线程
    service = undefined;
    /**
     * 获取原始字体文件
     *
     * @param name 字体文件的名称，用于指定OSS中的具体对象键
     * @returns 返回一个Promise对象，解析为一个包含哈希值和二进制数据的对象
     */
    getOriginFont(name: string) {
        return this.OSS.send(
            new GetObjectCommand({
                Bucket: this.buckets.originFont,
                Key: name,
            })
        ).then(async (res) => {
            const binary = await res.Body?.transformToByteArray();
            const hash = await sha256(binary);
            return {
                hash,
                binary,
            };
        });
    } /** 上传原始字体到 OSS */
    uploadFont(key: string, font: Uint8Array) {
        return this.OSS.send(
            new PutObjectCommand({
                Bucket: this.buckets.originFont,
                Key: key,
                Body: font,
            })
        );
    }
    async buildFont(url: URL) {
        const query = this.decodeURL(url);
        const runtimeKey = await sha256(JSON.stringify(query));
        const targetUrl = await this.splitFontTask(query);
        await this.KV.setItem(runtimeKey, targetUrl);
        return targetUrl;
    }

    /** 纯粹分割字体的任务：
     * 1. 获取字体
     * 2. 分割字体
     * 3. 输出 result.css 地址
     */
    async splitFontTask(query: ReturnType<FontCSSAPI['decodeURL']>) {
        const data = await this.getOriginFont(query.family);
        await this.subsetFont(data.binary, data.hash);
        return this.baseURL + '/' + data.hash + '/result.css';
    }

    /** 分割字体 */
    async subsetFont(blob: Uint8Array, baseFolder: string) {
        return fontSplit({
            FontPath: blob,
            destFold: '',
            chunkSize: 70 * 1024,
            testHTML: false,
            reporter: false,
            threads: {
                service: this.service,
            },
            outputFile: async (name, blob) => {
                this.OSS.send(
                    new PutObjectCommand({
                        Bucket: this.buckets.resultFont,
                        Key: baseFolder + '/' + name,
                        Body: blob,
                    })
                );
            },
        });
    }
}
