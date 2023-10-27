const port = 8080;
// 用于加 cors 头部
const handler = async (request: Request) => {
    const base = new URL(request.url).searchParams.get('url')!;
    const req = await fetch(base);
    return new Response(req.body, {
        status: 200,
        headers: {
            'content-type': req.headers.get('content-type')!,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'max-age=360000',
        },
    });
};
Deno.serve({ port }, handler);
