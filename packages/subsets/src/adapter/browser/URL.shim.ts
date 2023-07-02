class URLProxy extends URL {
    constructor(url: string | URL, base?: string | URL | undefined) {
        if (typeof base === 'string' && base.startsWith('blob:')) {
            base = base.split(':')[1]

        } else if (base && typeof base !== 'string' && base.href.startsWith('blob')) {
            base = base.pathname
        }
        super(url, base)
    }

}
// 为了防止全局状态中 base 出现 blob 而导致的 URL 解析错误
if (!(globalThis instanceof URLProxy)) {
    globalThis._URL = URL
    globalThis.URL = URLProxy
}
