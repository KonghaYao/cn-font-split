import { Charset } from './FontSetMatch.js';
import { UnicodeCharset } from './UnicodeMatch.js';

/** 字符集支持报告的表格 */

export interface CharsetReporter {
    name: string;
    cn?: string;
    start?: number;
    end?: number;
    support_count: number;
    area_count: number;
    coverage: string;
    in_set_rate: string;
}
/** 从远程加载数据 json 文件 */

export type CharsetLoader = (path: string) => Promise<Charset | UnicodeCharset>;
