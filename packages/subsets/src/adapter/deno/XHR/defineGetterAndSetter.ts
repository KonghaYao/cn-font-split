/**
 * @license
 * Copyright 2021 KonghaYao 江夏尧 <dongzhongzhidong@qq.com>
 * SPDX-License-Identifier: Apache-2.0
 */
// 不可以在原生的 XMLHttpRequest 上直接定义 getter 和 setter，
// 也不可以在 XHR 实例上定义
// 这样的话会导致无法接收到数据

import { MockXMLHttpRequest } from './mockXHR';

// 但是确认为是 mockjs 内的数据返回就可以直接修改 XHR 实例了
const properties = [
    'readyState',
    'status',
    'response',
    'responseText',
    'statusText',
];
export function defineGetAndSet(XHR: XMLHttpRequest) {
    // 将这些 键值对 映射到 $data 属性对象的对应值上去
    const auto = properties.reduce((col, cur) => {
        col[cur] = {
            get() {
                return this.$data[cur];
            },
            set(state: string) {
                this.$data[cur] = state;
            },
        };
        return col;
    }, {} as any);
    Object.defineProperties(XHR, auto);

    Object.assign(XHR, {
        getResponseHeader(this: MockXMLHttpRequest, name: string) {
            return this._responseHeaders.get(name);
        },
        getAllResponseHeaders(this: MockXMLHttpRequest) {
            return [...this._responseHeaders.entries()]
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
        },
    });
}
