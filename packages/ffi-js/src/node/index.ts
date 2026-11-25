import path from 'path';
import { existsSync } from 'fs';
import { createRequire } from 'module';
import { FontSplitProps } from '../interface.js';
import { getBinName, getPlatformPackageName, matchPlatform } from '../load.js';
import { isMusl } from './isMusl.js';
export * from '../interface.js';
export * from '../createAPI.js';
// @ts-ignore
import { dlopen, Callback } from '@xan105/ffi/koffi';
import koffi from 'koffi';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createAPI } from '../createAPI.js';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);

const require = createRequire(import.meta.url);

/**
 * 解析动态库路径，优先级：
 * 1. CN_FONT_SPLIT_BIN 覆盖
 * 2. @cn-font-split/<platform> 平台包（optionalDependencies）
 * 3. 仓库内 dist/libffi-<target>.<ext> 回退（本地开发）
 */
const resolveBinPath = (): string => {
    const override = process.env.CN_FONT_SPLIT_BIN;
    if (override) return override;

    const isMuslPlatform = isMusl();
    const triple = matchPlatform(
        process.platform,
        process.arch,
        () => isMuslPlatform,
    );
    const packageKey = getPlatformPackageName(
        process.platform,
        process.arch,
        () => isMuslPlatform,
    );
    const tried: string[] = [];

    if (packageKey) {
        try {
            return require.resolve(`@cn-font-split/${packageKey}`);
        } catch {
            tried.push(`@cn-font-split/${packageKey}（平台包未安装）`);
        }
    }

    const localPath = path.resolve(__dirname, '../' + getBinName(triple));
    if (existsSync(localPath)) return localPath;
    tried.push(localPath);

    const installHint = packageKey
        ? `请安装对应的可选平台包：npm install @cn-font-split/${packageKey}`
        : `当前平台 ${process.platform}-${process.arch} 没有预编译平台包，请设置 CN_FONT_SPLIT_BIN。`;
    throw new Error(
        `cn-font-split 找不到可用的动态库。\n` +
            `当前平台：${process.platform}-${process.arch}\n` +
            `已尝试：\n${tried.map((item) => `  - ${item}`).join('\n')}\n` +
            `${installHint}\n` +
            `也可以用 CN_FONT_SPLIT_BIN 指向 libffi 动态库。`,
    );
};

const binPath = resolveBinPath();
const dylib = dlopen(binPath, {
    font_split: {
        parameters: ['pointer', 'usize', 'function'],
        result: 'void',
    },
});
const createCallback = (cb: (data: Uint8Array) => void) =>
    new Callback(
        {
            parameters: ['pointer', 'usize'],
            result: 'void',
        },
        (ptr: any, length: number) => {
            const data = koffi.decode(
                ptr,
                koffi.array('uint8_t', length, 'Array'),
            );
            cb(new Uint8Array(data));
        },
    ).pointer;

export const fontSplit = createAPI(dylib.font_split, createCallback);
