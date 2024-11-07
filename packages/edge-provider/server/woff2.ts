import { compress } from '@chinese-fonts/wawoff2';
import { Hono } from 'hono';

const app = new Hono();

app.post('/woff2', async (c) => {
    const buffer = await c.req.raw.arrayBuffer();
    if (!buffer || !(buffer instanceof ArrayBuffer)) {
        return c.json({ error: 'Invalid buffer' }, 400);
    }
    console.log('hit')
    const data = await compress(new Uint8Array(buffer));
    return c.body(data);
});

export default app;
