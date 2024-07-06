import md5 from '../utils/md5';

export interface ReplaceProps {
    transferred: Uint8Array;
    ext: string;
    index: number;
}

const REGEXP = /\[\\*([\w:]+)\\*\]/gi;

/**
 * 根据给定的数据替换模板中的占位符。
 */
export const templateReplace = (template: string, data: ReplaceProps) => {
    // 初始化一个映射，用于存储不同类型的占位符及其对应的替换函数。
    const replacements = new Map<string, IReplacer>();

    // 添加索引占位符的替换函数。
    replacements.set('index', createReplacer(data.index.toString()));
    // 添加文件扩展名占位符的替换函数。
    replacements.set('ext', createReplacer(data.ext));
    // 添加哈希占位符的替换函数，这里同时使用'md5'作为别名。
    const hashReplacer = createLengthReplacer(
        createReplacer(() => md5(data.transferred)),
    );
    replacements.set('hash', hashReplacer);
    replacements.set('md5', hashReplacer);

    // 使用正则表达式匹配模板中的占位符，并根据匹配结果进行替换。
    const result = template.replace(REGEXP, (match, content) => {
        // 判断是否为简单的占位符（无参数）。
        if (content.length + 2 === match.length) {
            // 尝试解析占位符的类型和参数。
            const contentMatch = /^(\w+)(?::(\w+))?$/.exec(content);
            if (!contentMatch) return match;
            const [, kind, arg] = contentMatch;
            // 获取对应的替换函数，并应用参数进行替换。
            const replacer = replacements.get(kind);
            if (replacer !== undefined) {
                return replacer(arg);
            }
            // 处理转义的字符。
        } else if (match.startsWith('[\\') && match.endsWith('\\]')) {
            return `[${match.slice(2, -2)}]`;
        }
        // 对无法识别的匹配项，原样返回。
        return match;
    });

    return result;
};

/** 字符串处理函数的类型 */
type IReplacer = (arg?: string) => string;

/** 统一输出字符串处理函数 */
const createReplacer = (value: string | (() => string)): IReplacer => {
    const fn = () => {
        if (typeof value === 'function') value = value();
        return value;
    };
    return fn;
};

const createLengthReplacer = (replacer: IReplacer) => {
    const fn: IReplacer = (arg) => {
        const length = arg && parseInt(arg, 10);
        const hash = replacer();
        return length ? hash.slice(0, length) : hash;
    };
    return fn;
};
