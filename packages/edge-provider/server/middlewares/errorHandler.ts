import { MiddlewareHandler } from 'hono';
export const errorHandler: MiddlewareHandler = async (c, next) => {
    await next();
    if (c.error)
        c.res = c.json(
            {
                code: 1,
                message: c.error.message,
            },
            200,
        );
};
