import { readFileSync } from 'fs';

export function renderToHumanReadableText(
    subset: ReturnType<typeof findWhichSubset>,
): string {
    // console.log(subset);
    const ready = Object.entries(subset).filter(([, v]) => v.length > 0);
    const main = ready
        .map(([src, codes], index) => {
            const unicodes = new Set(codes.map((i) => i.code));
            const usageRate =
                (unicodes.size * 100) / (codes[0].p?.range.length || NaN);
            return `
${index + 1} ${usageRate.toFixed(0)}% ${src}: 
---
${String.fromCodePoint(...unicodes)}
---`;
        })
        .join('\n');
    return `总数: ${ready.length} \n` + main;
}

export function main(str: string, cssPath: string) {
    return renderToHumanReadableText(
        findWhichSubset(
            readFileSync(str, 'utf-8'),
            readFileSync(cssPath, 'utf-8'),
        ),
    );
}

// 读取 sample 文件，并分析使用字符情况
export function run() {
    const str = process.argv[2];
    const cssPath = process.argv[3];
    console.log(str, cssPath);
    console.log(main(str, cssPath));
}
run();

export function findWhichSubset(str: string, css: string) {
    const pkg = getSubsetsFromCSS(css);
    const AToB = [...str]
        .map((i) => i.codePointAt(0)!)
        .map((code) => {
            const p = pkg.find((p) => {
                const isInThisP = p?.range.includes(code);
                return isInThisP;
            });
            return {
                code,
                p,
            };
        });

    // p 为维度，聚合 code 为 array
    const result = AToB.reduce(
        (acc, t) => {
            const { p } = t;
            if (t.p) {
                /** @ts-ignore */
                if (!acc[p.src]) {
                    /** @ts-ignore */
                    acc[p.src] = [];
                }
                /** @ts-ignore */
                acc[p.src].push(t);
            } else {
                acc.unknown.push(t);
            }
            return acc;
        },
        {
            unknown: [],
        } as Record<string, typeof AToB>,
    );
    return result;
}

/** 从 CSS 文件中获取字体 subsets 类型的数据 */
export function getSubsetsFromCSS(css: string) {
    const list = css.match(/@font-face[\s\S]+?\}/g);
    if (!list) return [];
    return list
        .map((face) => {
            const unicodeList = face.match(/unicode-range:([\s\S]*(?:[,;]))+/);
            const src = face.match(/src:[^;]*(?:[,;])+/);
            if (!unicodeList) return null;
            const range = unicodeList[1];
            return {
                src,
                range: range
                    .split(/[,;]/)
                    .map((i) => i.trim())
                    .filter(Boolean)
                    .map((i) => {
                        i = i.replace('U+', '');
                        if (i.includes('-')) {
                            return i.split('-').map((i) => parseInt('0x' + i));
                        } else {
                            return parseInt('0x' + i);
                        }
                    })
                    .flatMap((arr) => {
                        if (typeof arr === 'number') {
                            return [arr];
                        } else {
                            const [start, end] = arr;

                            // 包含 end 的区间
                            return Array.from(
                                { length: end - start + 1 },
                                (_, i) => start + i,
                            );
                        }
                    }),
            };
        })
        .filter(Boolean);
}
