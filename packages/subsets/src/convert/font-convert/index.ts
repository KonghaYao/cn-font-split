let convert: (
    buffer: Uint8Array,
    toFormat: FontType,
    fromFormat?: FontType,
) => Promise<Uint8Array>;
//ifdef node
import { convert as nodeConvert } from './font-converter.node';
convert = nodeConvert;
//endif

//ifdef browser
import { convert as commonConvert } from './font-converter';
convert = commonConvert;
import { DenoAdapter } from '../../adapter/deno/index';
import '../../adapter/browser/URL.shim'; // 为了防止全局状态中 base 出现 blob 而导致的 URL 解析错误
import { FontType } from '../detectFormat';
await DenoAdapter();
//endif

export { convert };
