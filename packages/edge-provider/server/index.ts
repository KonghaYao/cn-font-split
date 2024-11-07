import { Hono } from 'hono';
import { FontCSSAPI } from './src/index.js'; // 假设这是你的 API 类的导入路径
import { RemoteConvertManager } from './src/cn-font-split/RemoteConvertManager.js';

const app = new Hono();

app.get('/css2', async (c) => {
    const fontApi = new FontCSSAPI('https://play.min.io:9000/result-font');
    fontApi.service = new RemoteConvertManager(() => {
        return 'http://0.0.0.0:8001/woff2';
    });
    const url = await fontApi.main(new URL(c.req.url)); // 使用 c.req.url 获取请求 URL

    // 设置缓存控制头，模拟原来的缓存策略
    c.res.headers.set('Cache-Control', `public, max-age=${60 * 60}`);

    // 重定向到生成的 URL
    return c.redirect(url, 302);
});

app.post('/upload', async (c) => {
    try {
        // 获取查询参数中的 filename
        const filename = c.req.query('filename');
        if (!filename || typeof filename !== 'string') {
            return c.json({ error: 'Invalid filename' }, 400);
        }

        // 读取请求体中的 buffer
        const buffer = await c.req.raw.arrayBuffer();
        if (!buffer || !(buffer instanceof ArrayBuffer)) {
            return c.json({ error: 'Invalid buffer' }, 400);
        }

        // 调用 FontCSSAPI 的 uploadFont 方法
        const url = await new FontCSSAPI('https://base.com').uploadFont(
            filename,
            new Uint8Array(buffer),
        );

        // 返回生成的 URL
        return c.json({ url });
    } catch (error) {
        // 错误处理
        console.error(error);
        return c.json({ error: 'An error occurred' }, 500);
    }
});

export default app;
