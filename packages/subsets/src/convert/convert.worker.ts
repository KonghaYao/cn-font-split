import type { FontType } from '../utils/detectFormat';
import { worker, Transfer } from 'workerpool';
import { convert } from './commonConvert';
// 欺骗 环境，认为是 classic worker
!globalThis.importScripts &&
    (globalThis.importScripts = (...args: string[]) => {
        console.warn('触发 importScripts 的伪装，可能导致 bug，', args);
    });

worker({
    async convert(buffer: Uint8Array, targetType: FontType) {
        const res = await convert(buffer, targetType).catch((error) => {
            console.error(error);
            return new Uint8Array([]);
        });
        return new Transfer(res, [res.buffer]);
    },
});
