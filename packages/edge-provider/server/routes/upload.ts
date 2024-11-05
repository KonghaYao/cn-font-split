import { FontCSSAPI } from '~/src';

export default eventHandler(async (event) => {
    const filename = getRequestURL(event).searchParams.get('filename');
    const buffer = await readRawBody(event, false);
    const url = await new FontCSSAPI('https://base.com').uploadFont(
        filename,
        buffer,
    );
    return new Response(JSON.stringify(url));
});
