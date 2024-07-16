// 在 web worker 中的脚本
import type { FontType } from './detectFormat';
import { worker, Transfer } from 'workerpool';
import { convert } from './font-convert/index';

// 欺骗 环境，认为是 classic worker
!globalThis.importScripts &&
    (globalThis.importScripts = (...args: string[]) => {
        console.warn('触发 importScripts 的伪装，可能导致 bug，', args);
    });

worker({
    async convert(
        buffer: Uint8Array,
        toFormat: FontType,
        fromFormat?: FontType,
        buildMode?: 'stable' | 'speed',
    ) {
        const res = await convert(
            buffer,
            toFormat,
            fromFormat,
            buildMode,
        ).catch((error) => {
            console.error(error);
            return new Uint8Array([]);
        });
        return new Transfer(res, [res.buffer]);
    },
});
