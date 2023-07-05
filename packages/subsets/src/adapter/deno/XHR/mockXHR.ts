/**
 * @license
 * Copyright 2021 KonghaYao 江夏尧 <dongzhongzhidong@qq.com>
 * SPDX-License-Identifier: Apache-2.0
 */
// 用于 deno 环境中模仿 browser 情况

// 使用不完全覆盖的方式，使用继承方式继承所有的属性
// 只在 send 方式调用的时候对其进行数据返回
import { defineGetAndSet } from "./defineGetterAndSetter.js";
const toHeaders = (obj: Record<string, string>) => {
    const hd = new Headers();
    Object.entries(obj).forEach(([key, value]) => {
        hd.set(key, value);
    });
    return hd;
};

type ProxyFunc = (input: {
    url: URL;
    headers: Headers;
    method: RequestInit["method"];
    body: RequestInit["body"];
}) => void | Promise<Response>;
const config = {
    proxy: null as null | ProxyFunc,
    silent: false,
};
let XHR!: XMLHttpRequest
type Method = NonNullable<RequestInit["method"]>;
// ! 虽然 XMLHttpRequest 不能够修改，但是可以通过设置 getter 和 setter 将属性映射到 $属性上，这样的话，原生 XHR 会将数据写入和读取的位置更改为新的对象属性上，这样就可以被我们修改了。

export class MockXMLHttpRequest extends XMLHttpRequest {
    $mock = true; // 标识是否打开拦截
    open(
        method: Method,
        url: string | URL,
        _?: boolean,
        username?: string,
        password?: string
    ) {
        if (typeof url === "string" && url.startsWith("file:///")) {
            const originURL = url;
            url = new URL("https://a");
            url.hash = encodeURIComponent(originURL);
        }

        // 不进行同步操作
        super.open.call(this, method, url, true, username, password);
        this.$data.url = url;
        this.$data.method = method.toLowerCase();
    }
    //! 注意 send 必须是同步函数，这里不能够使用 async
    send(body: any) {
        if (this.$mock) {
            const { url, headers = {}, method } = this.$data;
            if (config.proxy === null) throw new Error('xhr 代理|send|proxy 获取错误')
            const result = config.proxy && config.proxy({
                url:
                    url instanceof URL
                        ? url
                        : new URL(url, globalThis.location?.origin),
                headers: toHeaders(headers),
                method,
                body,
            });
            // console.log(result);
            if (result) {
                defineGetAndSet(this);
                this.dispatchEvent(new ProgressEvent("loadstart"));
                // 伪造 XHR 返回事件

                setTimeout(async () => {
                    this.$data.readyState = this.HEADERS_RECEIVED;
                    this.dispatchEvent(new ProgressEvent("readystatechange"));

                    this.$data.readyState = this.LOADING;
                    this.dispatchEvent(new ProgressEvent("readystatechange"));

                    await this.$request.call(this, await result);
                }, 0);
                return;
            }
            // 这里穿透下去
        }
        super.send.call(this, body);
    }
    setRequestHeader(key: string, value: string) {
        this.$data.headers[key] = value;
        return super.setRequestHeader.call(this, key, value);
    }
    $data = {
        // 原生属性的 getter 和 setter
        readyState: 0,
        status: 200,
        response: "",
        responseText: "",
        statusText: "",
        headers: {} as Record<string, string>,
        url: "" as string | URL,
        method: "get" as Method,
    };
    _responseHeaders = new Headers();
    _useResponseType(res: Response) {
        switch (this.responseType) {
            case "blob":
                return res.blob();
            case "json":
                return res.json();

            case "arraybuffer":
                return res.arrayBuffer();
            case "text":
            default:
                return res.text();
        }
    }
    async $request(res: Response) {
        !config.silent && console.warn("XHR 代理中", this.$data.url.toString());

        this._responseHeaders = res.headers;
        this.$data.status = res.status;
        this.$data.statusText = "";
        // Statuses(res.status);

        this.$data.responseText = this.response;
        this.$data.response = await this._useResponseType(res);

        this.$data.readyState = this.DONE;
        this.dispatchEvent(new ProgressEvent("readystatechange"));
        const e = new ProgressEvent("load");
        this.dispatchEvent(e);
        this.onload && this.onload(e);
        this.dispatchEvent(new ProgressEvent("loadend"));
    }
}
export function mockXHR({
    proxy,
    silent = false,
    window = globalThis,
}: {
    proxy: ProxyFunc;
    silent: boolean;
    window?: any;
}) {
    const parent = window
    if (proxy instanceof Function) config.proxy = proxy;

    config.silent = silent;

    if (parent.XMLHttpRequest && !parent.XMLHttpRequest.$mock) {
        XHR = parent.XMLHttpRequest
        parent.XMLHttpRequest = MockXMLHttpRequest
        parent.XMLHttpRequest.$mock = true;
        if (!silent) console.warn("XHR 已经被代理");
    }
}
