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

    async get(url, Key) {
        url = (this.proxyURL ?? '') + url;
        const key = Key ?? this.urlToKey(url);
        const isExist = await this.isExist(key);
        if (isExist) {
            return this.getWithoutCache(key).then(() => './temp/font/' + key);
        } else {
            console.log(key);
            return this.cacheFetch(url).then((res) => {
                fs.outputFileSync('./temp/font/' + key, res);
                return './temp/font/' + key;
            });
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
