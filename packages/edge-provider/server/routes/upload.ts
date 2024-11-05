import { FontCSSAPI } from '~/src';

export default eventHandler(async (event) => {
    const filename = getRequestURL(event).searchParams.get('filename');
    if (!filename || typeof filename !== 'string') {
        return new Response(JSON.stringify({ error: 'Invalid filename' }), {
            status: 400,
        });
    }

    const buffer = await readRawBody(event, false);
    if (!buffer || !(buffer instanceof Buffer)) {
        return new Response(JSON.stringify({ error: 'Invalid buffer' }), {
            status: 400,
        });
    }

    const url = await new FontCSSAPI('https://base.com').uploadFont(
        filename,
        buffer,
    );
    return new Response(JSON.stringify(url), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
});
