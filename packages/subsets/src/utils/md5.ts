type MD5Function = (buffer: Uint8Array) => string;

let OutputMd5: MD5Function;

//ifdef node
import crypto from 'crypto';
OutputMd5 = (b: Uint8Array) => {
    const buffer = Buffer.from(b);
    const sf = crypto.createHash('md5');
    sf.update(buffer);
    return sf.digest('hex');
};
//endif

//ifdef browser
import { isDeno } from './env';
import md5 from 'md5';
if (isDeno) {
    const { Md5 } = await import('https://deno.land/std@0.119.0/hash/md5.ts');
    OutputMd5 = (b: Uint8Array) => new Md5('md5').update(b).toString();
} else {
    OutputMd5 = md5;
}
//endif

// 留下一段话，防止跨平台打包的一个 BUG
export default OutputMd5;
