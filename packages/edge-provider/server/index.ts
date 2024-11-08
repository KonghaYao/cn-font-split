import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { FontCSSAPI } from './src/index.js'; // 假设这是你的 API 类的导入路径
import { BuilderAPI } from './src/BuilderAPI.js';
import { RemoteConvertManager } from './src/cn-font-split/RemoteConvertManager.js';

const app = new Hono();
app.get('/css2', async (c) => {
    console.log(env(c));
    const fontApi = new FontCSSAPI(c);
    const url = await fontApi.main(new URL(c.req.url)); // 使用 c.req.url 获取请求 URL

    // 设置缓存控制头，模拟原来的缓存策略
    c.res.headers.set('Cache-Control', `public, max-age=${60 * 60}`);

    // 重定向到生成的 URL
    return c.redirect(url, 302);
});

// 构建字体的接口，输入同 css2 一样
app.get('/build', async (c) => {
    const fontApi = new BuilderAPI(c);

    fontApi.service =
        env(c).WOFF2_SERVER &&
        new RemoteConvertManager(() => {
            return env(c).WOFF2_SERVER as string;
        });
    const url = await fontApi.buildFont(new URL(c.req.url)); // 使用 c.req.url 获取请求 URL

    // 重定向到生成的 URL
    return c.json({ url });
});

// 上传原始字体到 OSS 库进行存储
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
        const url = await new BuilderAPI(c).uploadFont(
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
