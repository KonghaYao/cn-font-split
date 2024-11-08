// cloudflare 特供版本
import compress from './cloudflare/compress.js';
import { Hono } from 'hono';
import instance from '@chinese-fonts/wawoff2/build/compress_binding.wasm';

const app = new Hono();
const module = compress({ instance });

app.post('/woff2', async (c) => {
    const buffer = await c.req.raw.arrayBuffer();
    if (!buffer || !(buffer instanceof ArrayBuffer)) {
        return c.json({ error: 'Invalid buffer' }, 400);
    }
    console.log('hit');
    const data = await module.compress(new Uint8Array(buffer));
    return c.body(data);
});

export default app;
