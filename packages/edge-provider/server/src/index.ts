import { Client } from 'minio';
import { KV } from './KV/index';
class FontCSSAPI {
    OSS: Client;
    KV = useStorage();
    constructor() {
        this.OSS = new Client({
            endPoint: 'play.min.io',
            port: 9000,
            useSSL: true,
            accessKey: 'Q3AM3UQ867SPQQA43P2F',
            secretKey: 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG',
        });
    }
    decodeURL(req: Request) {
        return {};
    }
    async main(req: Request) {
        const query = this.decodeURL(req);
        // const hit = await this.isCached(query);
        // if (hit) return this.getCache();

        
    }
    async subsetFont(blob: Uint8Array, baseFolder: string) {
        return fontSplit({
            FontPath: blob,
            destFold: '',
            chunkSize: 70 * 1024, // 如果需要的话，自己定制吧
            testHTML: false, // 输出一份 html 报告文件
            reporter: false, // 输出 json 格式报告
            previewImage: false, // 只要填入 这个参数，就会进行图片预览文件生成，文件为 SVG 格式
            threads: {}, // 默认开启多线程，速度飞快
            async outputFile(name, blob) {
                this.OSS.saveFile(name, blob);
            },
        });
    }
}
