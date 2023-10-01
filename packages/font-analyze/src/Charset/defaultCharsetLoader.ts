import { Charset } from './FontSetMatch.js';
import { UnicodeCharset } from './UnicodeMatch.js';

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
export type CharsetLoader = (path: string) => Promise<Charset | UnicodeCharset>;
export const defaultCharsetLoader: CharsetLoader = async (path) => {
    const { default: D } = await import('../data/' + path);
    return D;
};
