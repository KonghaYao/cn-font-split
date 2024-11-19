import { isNode, isBrowser } from './env';
//ifdef node
import { fileURLToPath } from 'node:url';
//endif

const reactiveResolve = (path: string) => {
    // ! 可能因 import.meta.url 报错
    const url = new URL(path, import.meta.url);
    return isNode ? fileURLToPath(url.toString()) : url.toString();
};

/** 解决 Browser 情况下的 Worker 跨域问题 */
export const WorkerURLWrapper = (
    url: string,
    type: 'classic' | 'module' = 'module',
) => {
    if (isBrowser) {
        if (type === 'module') {
            const blob = new Blob(
                [`import "${new URL(url, import.meta.url)}"`],
                { type: 'text/javascript' },
            );
            const res = URL.createObjectURL(blob);
            return reactiveResolve(res);
        } else {
            const blob = new Blob(
                [`importScripts("${new URL(url, import.meta.url)}")`],
                { type: 'application/javascript' },
            );
            return URL.createObjectURL(blob);
        }
    }
    return reactiveResolve(url);
};
