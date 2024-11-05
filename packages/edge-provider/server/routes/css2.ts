import { FontCSSAPI } from '~/src';

export default defineCachedEventHandler(
    async (event) => {
        const url = await new FontCSSAPI(
            'https://play.min.io:9000/result-font',
        ).main(getRequestURL(event));
        return sendRedirect(event, url, 302);
    },
    {
        maxAge: 60 * 60,
        base: 'db',
        name: 'css2-cache',
        getKey: (e) => getRequestURL(e).toString(),
    },
);
