import { Application, Router } from 'https://deno.land/x/oak/mod.ts';
import { Md5 } from 'https://deno.land/std@0.95.0/hash/md5.ts';
import {
    fontSplit,
    Assets,
    DenoAdapter,
} from 'https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split/dist/browser/index.js';
await DenoAdapter();
Assets.pathTransform = (innerPath) =>
    innerPath.replace(
        './',
        'https://cdn.jsdelivr.net/npm/@konghayao/cn-font-split/dist/browser/',
    );
const UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const kv = await Deno.openKv();
const app = new Application();
const router = new Router();
// 上传文件并存储
router.post('/upload', async (ctx) => {
    const buffer = await ctx.request.body.arrayBuffer();
    const name = ctx.request.headers.get('filename');
    const hash = new Md5('md5').update(buffer).toString();
    console.log(hash);
    const cacheURL = await kv.get([hash]);
    console.log(cacheURL);
    if (cacheURL.value) {
        ctx.response.body = JSON.stringify({
            code: 50,
            msg: 'content existed',
            data: { name, hash, url: cacheURL.value },
        });
    } else {
        const url = await upload(new Blob([buffer]), name, hash);
        await kv.set([hash], url);
        ctx.response.body = JSON.stringify({
            code: 0,
            data: { name, hash, url },
        });
    }
});
// kv.set(["f7ee05dd168d7623046d621c8193c336" ], "https://we.tl/t-eCzYb8ZH3m")
const downloadFromKV = async (hash) => {
    const url = (await kv.get([hash])).value;
    if (url) {
        return download(url);
    } else {
        console.log(hash, url);
        throw new Error('not found');
    }
};
router.get('/split', async (ctx) => {
    const hash = await ctx.request.url.searchParams.get('hash');
    console.log(hash);
    const charset = ctx.request.url.searchParams
        .get('splitText')
        .split('')
        .filter(Boolean)
        .map((i) => i.charCodeAt(0));
    const blob = await downloadFromKV(hash).then((res) => res.arrayBuffer());
    console.log(blob.byteLength);
    const pack = await new Promise((res) => {
        return fontSplit({
            FontPath: new Uint8Array(blob),
            destFold: '',
            chunkSize: 70 * 1024, // 如果需要的话，自己定制吧
            testHTML: false, // 输出一份 html 报告文件
            reporter: false, // 输出 json 格式报告
            previewImage: false, // 只要填入 这个参数，就会进行图片预览文件生成，文件为 SVG 格式
            threads: {}, // 默认开启多线程，速度飞快
            css: false,
            subsets: [charset],
            outputFile(name, blob) {
                res({ name, blob });
            },
        });
    });
    // 给 response 设置无限长的缓存
    ctx.response.set('filename', pack.name);
    ctx.response.set('Cache-Control', 'max-age=31536000, immutable');
    ctx.response.set('Content-Type', 'application/octet-stream');
});
app.use(router.routes());
console.log('Server listening on http://localhost:8000');
await app.listen({ port: 8000 });
/**
 * download file from shortend_url
 * @param {*} shortened_url
 * @returns blob
 */
async function download(shortened_url) {
    const res = await fetch(shortened_url).then((res) => {
        const [transfer_id, security_hash] = res.url.split('/').slice(-2);
        const j = {
            intent: 'entire_transfer',
            security_hash: security_hash,
        };
        return fetch(
            `https://wetransfer.com/api/v4/transfers/${transfer_id}/download`,
            {
                headers: { 'content-type': 'application/json' },
                method: 'post',
                body: JSON.stringify(j),
            },
        ).then((res) => res.json());
    });
    console.log(res.direct_link);
    return fetch(res.direct_link);
}
/**
 * upload to wetransfer
 * @param {*} file
 * @param {*} hash
 * @returns shared URL
 */
async function upload(file, filename, hash) {
    const transfer = await fetch(
        'https://wetransfer.com/api/v4/transfers/link',
        {
            headers: {
                accept: 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/json',
                'sec-ch-ua':
                    '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-amplitude-country': 'CN',
                'x-amplitude-device-family': 'Macintosh',
                'x-amplitude-device-id': 'YexdY326lbjSrV1RiXozWp',
                'x-amplitude-device-type': 'Apple Macintosh',
                'x-amplitude-language': 'en',
                'x-amplitude-platform': 'Web',
                'x-app-origin': 'decoupled',
                'User-Agent': UA,
                Referer: 'https://wetransfer.com/',
                Origin: 'https://wetransfer.com',
                'x-requested-with': 'XMLHttpRequest',
            },
            referrer: 'https://wetransfer.com/',
            referrerPolicy: 'origin',
            body: JSON.stringify({
                message: '',
                display_name: filename,
                ui_language: 'en',
                domain_user_id: '2eb931a1-2f8f-4bf5-a649-1de732acd838',
                files: [{ name: filename, size: file.size, item_type: 'file' }],
                expire_in: 604800,
            }),
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
        },
    ).then((res) => res.json());
    let authorization = transfer.storm_upload_token;
    console.log('transfer', transfer);
    const urls = JSON.parse(atob(authorization.split('.')[1]));
    console.log('checked', urls);
    authorization = 'Bearer ' + authorization;
    await fetch(urls['storm.preflight_batch_url'], {
        headers: {
            accept: 'application/json',
            'accept-language': 'zh-CN,zh;q=0.9',
            authorization,
            'content-type': 'application/json',
            'sec-ch-ua':
                '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'User-Agent': UA,
            Referer: 'https://wetransfer.com/',
            Origin: 'https://wetransfer.com',
            'x-requested-with': 'XMLHttpRequest',
        },
        referrer: 'https://wetransfer.com/',
        referrerPolicy: 'origin',
        body: JSON.stringify({
            items: [
                {
                    path: filename,
                    item_type: 'file',
                    blocks: [{ content_length: file.size }],
                },
            ],
        }),
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
    }).then(async (res) => {
        if (res.status !== 200) {
            console.log(await res.text());
            throw new Error('preflict');
        }
        return res.blob();
    });
    console.log('preflict');
    const blocks = await fetch(urls['storm.announce_blocks_url'], {
        headers: {
            accept: 'application/json',
            'accept-language': 'zh-CN,zh;q=0.9',
            authorization,
            'content-type': 'application/json',
            'idempotency-key':
                '"0asfHJuFkqwuhgBlE1OBzZ_g8mkJl_DocAfD5Je23HvYwsYpLQxyz_XgJd2T9NPY"',
            'sec-ch-ua':
                '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
        },
        referrer: 'https://wetransfer.com/',
        referrerPolicy: 'origin',
        body: JSON.stringify({
            blocks: [{ content_length: file.size, content_md5_hex: hash }],
        }),
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
    }).then((res) => res.json());
    const url = blocks.data.blocks[0].presigned_put_url;
    console.log('got upload server url');
    await fetch(url, {
        headers: {
            accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
        },
        referrer: 'https://wetransfer.com/',
        referrerPolicy: 'origin',
        body: null,
        method: 'OPTIONS',
        mode: 'cors',
        credentials: 'omit',
    });
    await fetch(url, {
        headers: {
            accept: '*/*',
            'accept-language': 'zh-CN,zh;q=0.9',
            ...blocks.data.blocks[0].put_request_headers,
        },
        referrer: 'https://wetransfer.com/',
        referrerPolicy: 'origin',
        body: file,
        method: 'PUT',
        mode: 'cors',
        credentials: 'omit',
    }).then((res) => {
        console.log(res.status);
        if (res.status >= 300) {
            throw Error('upload failed');
        }
        return res.blob();
    });
    await new Promise((resolve) => {
        setTimeout(resolve, 3000);
    });
    console.log('get Callback URL');
    const result = await fetch(urls['storm.create_batch_url'], {
        headers: {
            accept: 'application/json',
            'accept-language': 'zh-CN,zh;q=0.9',
            authorization,
            'content-type': 'application/json',
            'idempotency-key':
                '"0asfHJuFkqwuhgBlE1OBzZ_g8mkJl_DocAfD5Je23HvYwsYpLQxyz_XgJd2T9NPY"',
            'sec-ch-ua':
                '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'x-deadline': '5',
            'x-error-budget': 'reqs=15 oks=14 avail=1.00',
        },
        referrer: 'https://wetransfer.com/',
        referrerPolicy: 'origin',
        body: JSON.stringify({
            items: [
                {
                    path: filename,
                    item_type: 'file',
                    block_ids: [blocks.data.blocks[0].block_id],
                },
            ],
        }),
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
    }).then((res) => res.json());
    console.log(result);
    const finalize = await fetch(
        'https://wetransfer.com/api/v4/transfers/' + transfer.id + '/finalize',
        {
            headers: {
                accept: 'application/json, text/plain, */*',
                'accept-language': 'zh-CN,zh;q=0.9',
                'content-type': 'application/json',
                'sec-ch-ua':
                    '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'x-amplitude-country': 'CN',
                'x-amplitude-device-family': 'Macintosh',
                'x-amplitude-device-id': 'YexdY326lbjSrV1RiXozWp',
                'x-amplitude-device-type': 'Apple Macintosh',
                'x-amplitude-language': 'en',
                'x-amplitude-platform': 'Web',
                'x-app-origin': 'decoupled',
                'User-Agent': UA,
                Referer: 'https://wetransfer.com/',
                Origin: 'https://wetransfer.com',
                'x-requested-with': 'XMLHttpRequest',
            },
            referrer: 'https://wetransfer.com/',
            referrerPolicy: 'origin',
            body: '{"wants_storm":true}',
            method: 'PUT',
        },
    ).then((res) => res.json());
    console.log(transfer.id);
    console.log(finalize);
    return finalize.shortened_url;
}
