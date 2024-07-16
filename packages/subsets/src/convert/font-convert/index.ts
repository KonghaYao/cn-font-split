// wasm 版本可以运行在任何平台
import { convert as commonConvert } from './font-converter';

//ifdef node
import { convert as nodeConvert } from './font-converter.node';
(globalThis as any).nodeConvert = nodeConvert;
//endif

//ifdef browser
import { DenoAdapter } from '../../adapter/deno/index';
import '../../adapter/browser/URL.shim'; // 为了防止全局状态中 base 出现 blob 而导致的 URL 解析错误
import { FontType } from '../detectFormat';
await DenoAdapter();
//endif

const convert = (
    buffer: Uint8Array,
    toFormat: FontType,
    fromFormat?: FontType,
    buildMode: 'stable' | 'speed' = 'stable',
): Promise<Uint8Array> => {
    const convertFunc =
        buildMode === 'stable'
            ? commonConvert
            : (globalThis as any).nodeConvert ?? commonConvert;
    return convertFunc(buffer, toFormat, fromFormat);
};
export { convert };
