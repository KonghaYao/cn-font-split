import { Assets } from '../adapter/assets';
import { cacheResult } from '../utils/cacheResult';

/** 构建轮廓数据库，存储方式为桶存储 */
export const createContoursMap = cacheResult(async () => {
    const buffer = await Assets.loadFileAsync('unicodes_contours.dat');
    const a = new Uint8Array(buffer.buffer);
    const map = new Map<number, number>();
    let wasted = 0;
    for (let index = 0; index < a.length; index++) {
        const element = a[index];
        element !== 0 ? map.set(index, element) : wasted++;
    }
    return map;
});
