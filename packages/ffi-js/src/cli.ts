#!/usr/bin/env node
import { getCliParams } from './gen/proto.js';

/** CLI 选项使用点路径（如 css.fontFamily），这里只做最小深赋值。 */
const setDeep = (target: Record<string, any>, key: string, value: unknown) => {
    const parts = key.split('.');
    let cursor = target;
    for (const part of parts.slice(0, -1)) {
        if (typeof cursor[part] !== 'object' || cursor[part] === null) {
            cursor[part] = {};
        }
        cursor = cursor[part];
    }
    cursor[parts[parts.length - 1]] = value;
};

getCliParams(process.argv, (program, run) => {
    run.action(async (data) => {
        let fontSplit;
        if (process.versions.bun) {
            fontSplit = (await import('./bun/index.js')).fontSplit;
        } else {
            fontSplit = (await import('./node/index.js')).fontSplit;
        }
        const newData: Record<string, any> = {};
        Object.entries(data).forEach(([key, value]) => {
            setDeep(newData, key, value);
        });
        await fontSplit(newData);
    });
    program.usage(
        '\ncn-font-split -i <字体地址> -o <文件夹地址>\ncn-font-split run -h # 查看更详细信息',
    );
});
