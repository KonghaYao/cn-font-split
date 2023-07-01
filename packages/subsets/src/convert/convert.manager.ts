import WORKER_URL from "omt:./convert.worker";
import workerpool from "workerpool";
import { reactiveResolve } from "../utils/relativeResolve";
import { isBrowser } from "../utils/env";
/** 解决 Browser 情况下的 Worker 跨域问题 */
const browserWorkerURL = (url: string, type: "classic" | "module" = 'classic') => {
    if (isBrowser) {
        if (type === 'module') {
            const blob = new Blob([`import "${url}"`], { type: "text/javascript" })
            const res = URL.createObjectURL(blob)
            console.log(url, res)
            return res
        } else {
            const blob = new Blob([`importScripts("${url}")`], { type: "application/javascript" })
            return URL.createObjectURL(blob)
        }
    }
    return url
}
export class ConvertManager {
    pool = workerpool.pool(browserWorkerURL(reactiveResolve("./" + WORKER_URL), 'module'));

    destroy(): void {
        this.pool.terminate();
    }
}
