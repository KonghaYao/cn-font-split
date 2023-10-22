export interface ReplaceProps {
    hash: () => string;
    ext: string;
    index: number;
}

const REGEXP = /\[\\*([\w:]+)\\*\]/gi;

/** 将文件命名模版字符串计算为最终命名 */
export const templateReplace = (template: string, data: ReplaceProps) => {
    const replacements = new Map<string, IReplacer>();

    replacements.set('index', createReplacer(data.index.toString()));
    replacements.set('ext', createReplacer(data.ext));
    // hash
    const hashReplacer = createLengthReplacer(createReplacer(data.hash));
    replacements.set('hash', hashReplacer);
    replacements.set('md5', hashReplacer);

    const result = template.replace(REGEXP, (match, content) => {
        if (content.length + 2 === match.length) {
            const contentMatch = /^(\w+)(?::(\w+))?$/.exec(content);
            if (!contentMatch) return match;
            const [, kind, arg] = contentMatch;
            const replacer = replacements.get(kind);
            if (replacer !== undefined) {
                return replacer(arg);
            }
        } else if (match.startsWith('[\\') && match.endsWith('\\]')) {
            return `[${match.slice(2, -2)}]`;
        }
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
        let result: string;
        const length = arg && parseInt(arg, 10);
        const hash = replacer();
        result = length ? hash.slice(0, length) : hash;
        return result;
    };
    return fn;
};
