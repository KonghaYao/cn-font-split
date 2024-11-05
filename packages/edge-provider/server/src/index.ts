import { fontSplit } from 'cn-font-split';
import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
export class FontCSSAPI {
    OSS: S3Client;
    buckets = {
        originFont: 'origin-font',
        resultFont: 'result-font',
    };
    KV = useStorage();
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
    uploadFont(key, font) {
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
    async main(url: URL) {
        const query = this.decodeURL(url);
        // const hit = await this.isCached(query);
        // if (hit) return this.getCache();
        const data = await this.getOriginFont(query.family);
        await this.subsetFont(data.binary, data.hash);
        return this.baseURL + '/' + data.hash + '/result.css';
    }
    getOriginFont(name: string) {
        return this.OSS.send(
            new GetObjectCommand({
                Bucket: this.buckets.originFont,
                Key: name,
            }),
        ).then(async (res) => {
            console.log(res)
            return {
                hash: res.ChecksumCRC32C,
                binary: await res.Body?.transformToByteArray(),
            };
        });
    }
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
