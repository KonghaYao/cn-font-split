import { S3Client } from '@aws-sdk/client-s3';
import { sha256 } from './sha256.js';
import { KV } from './KV/index.js';
import { Context } from 'hono';
import { env } from 'hono/adapter';

export class FontCSSAPI {
    OSS: S3Client;
    buckets = {
        originFont: 'origin-font',
        resultFont: 'result-font',
    };
    KV = KV();
    public baseURL: string;
    constructor(c: Context) {
        this.baseURL = env(c).CDN_URL;
        this.OSS = new S3Client({
            region: env(c).S3_REGION,
            forcePathStyle: true,
            endpoint: env(c).S3_ENDPOINT,
            credentials: {
                accessKeyId: env(c).S3_AK,
                secretAccessKey: env(c).S3_SK,
            },
        });
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
        throw new Error('font not build');
    }
}
