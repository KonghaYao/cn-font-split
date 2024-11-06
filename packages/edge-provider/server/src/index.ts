import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { sha256 } from './sha256.js';
import { KV } from './KV/index.js';
import { fontSplit } from './cn-font-split/index.js';
export class FontCSSAPI {
    OSS: S3Client;
    buckets = {
        originFont: 'origin-font',
        resultFont: 'result-font',
    };
    KV = KV();
    constructor(public baseURL: string) {
        this.OSS = new S3Client({
            region: 'us-east-1',
            forcePathStyle: true,
            endpoint: 'https://play.min.io:9000',
            credentials: {
                accessKeyId: 'Q3AM3UQ867SPQQA43P2F',
                secretAccessKey: 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG',
            },
        });
    }
    /** 上传原始字体到 OSS */
    uploadFont(key: string, font: Uint8Array) {
        return this.OSS.send(
            new PutObjectCommand({
                Bucket: this.buckets.originFont,
                Key: key,
                Body: font,
            }),
        );
    }
    decodeURL(url: URL) {
        const qs = url.searchParams;
        const str = qs.get('family');
        if (!str) throw new Error('no family');
        // TODO 解析更多 google 参数
        const [family, other] = str.split(':');
        return {
            family,
        };
    }
    async main(url: URL, usingCache = true) {
        const query = this.decodeURL(url);
        const runtimeKey = await sha256(JSON.stringify(query));
        const cached = await this.KV.getItem<string>(runtimeKey);
        console.log(cached);
        if (usingCache && cached) return cached;

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
            }),
        ).then(async (res) => {
            const binary = await res.Body?.transformToByteArray();
            const hash = await sha256(binary);
            return {
                hash,
                binary,
            };
        });
    }
    /** 分割字体 */
    async subsetFont(blob: Uint8Array, baseFolder: string) {
        return fontSplit({
            FontPath: blob,
            destFold: '',
            chunkSize: 70 * 1024, // 如果需要的话，自己定制吧
            testHTML: false, // 输出一份 html 报告文件
            reporter: false, // 输出 json 格式报告
            threads: {}, // 默认开启多线程，速度飞快
            outputFile: async (name, blob) => {
                this.OSS.send(
                    new PutObjectCommand({
                        Bucket: this.buckets.resultFont,
                        Key: baseFolder + '/' + name,
                        Body: blob,
                    }),
                );
            },
        });
    }
}
