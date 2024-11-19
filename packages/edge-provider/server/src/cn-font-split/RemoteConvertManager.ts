/**
 * 在主线程中管理字体转换 worker 的类
 */
export class RemoteConvertManager {
    pool = {
        async exec<T>(method: string | T, params?: any[] | null | undefined) {
            if (!params || !params[0]) throw new Error('远程发送错误');
            const [buffer] = params as [Uint8Array];
            return fetch(this.getUrl(), {
                method: 'post',
                body: buffer,
            })
                .then((res) => res.arrayBuffer())
                .then((res) => new Uint8Array(res));
        },
        getUrl() {
            return 'http://0.0.0.0:8001/woff2';
        },
    };

    constructor(getUrl: () => string) {
        this.pool.getUrl = getUrl;
    }
    destroy(): void {
        // 终止工作池，释放所有资源。
        // this.pool.terminate();
    }
}
