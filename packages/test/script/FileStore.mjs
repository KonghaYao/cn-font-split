import _ from 'lodash-es';
import fs from 'fs-extra';

export class FileStore {
    constructor(proxyURL) {
        this.proxyURL = proxyURL;
    }
    urlToKey(url) {
        return url.replace(/.*\/(.*?)$/, '$1');
    }
    isExist(key) {
        return fs.exists('./temp/font/' + key);
    }
    gettingCache = new Map();
    async get(url, Key) {
        url = (this.proxyURL ?? '') + url;
        const key = Key ?? this.urlToKey(url);
        const isExist = await this.isExist(key);
        if (isExist) {
            return this.getWithoutCache(key).then(() => './temp/font/' + key);
        } else {
            if (this.gettingCache.has(key)) return this.gettingCache.get(key);
            console.log(key);
            const p = this.cacheFetch(url).then((res) => {
                fs.outputFileSync('./temp/font/' + key, res);
                return './temp/font/' + key;
            });
            this.gettingCache.set(key, p);
            return p;
        }
    }
    cacheFetch(url) {
        return fetch(url)
            .then((res) => res.arrayBuffer())
            .then((res) => new Uint8Array(res));
    }

    async getWithoutCache(key) {
        return fs.readFileSync('./temp/font/' + key);
    }
}

export const fontStore = new FileStore();
