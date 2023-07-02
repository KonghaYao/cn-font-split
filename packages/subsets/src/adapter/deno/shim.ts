import "https://deno.land/x/xhr@0.3.0/mod.ts";
try {
    /** @ts-ignore */
    globalThis.location = {
        origin: "/",
        /** @ts-ignore */
        toString() {
            return;
        },
    };
} catch (e) { }

try {
    const { mockXHR } = await import("./XHR/mockXHR");

    const { fileURLToPath } = await import(
        "https://deno.land/std@0.170.0/node/url.ts"
    );
    // 让 XHR 在访问 fileURI 的时候转化为本地文件
    const cache = new Map<string, Uint8Array>();
    mockXHR({
        // 所有的 fetch 函数都会发送到这里
        proxy({ headers, body, method, url }) {
            // console.log(url);
            if (url.host === "a")
                return (async () => {
                    const path = fileURLToPath(
                        decodeURIComponent(url.hash.slice(1))
                    );

                    const item = cache.has(path)
                        ? cache.get(path)
                        : await Deno.readFile(path);
                    cache.set(path, item!);
                    // console.log(path, item);
                    // console.log(item);
                    return new Response(item, {
                        status: 200,
                        headers: { "content-type": "application/wasm" },
                    });
                })();
        },
        silent: true,
    });
} catch (e) { }
