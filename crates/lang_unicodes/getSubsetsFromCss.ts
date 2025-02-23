import fs from 'fs-extra';
main();
function main() {
    const css = fs.readFileSync('./scripts/noto-sans-sc.css', 'utf-8');
    const data = getSubsetsFromCSS(css);

    let flatten_data = data.map((i) => {
        return i.flatMap((subset) => {
            if (subset instanceof Array) {
                // 从 subset[0] 到 subset[1]
                let res: number[] = [];
                for (let index = subset[0]; index <= subset[1]; index++) {
                    res.push(index);
                }
                return res;
            } else {
                return [subset];
            }
        });
    });

    const final_data = flatten_data
        .map((i) => i.filter((ii) => ii >= 0x4e00 && ii <= 0x9fff))
        .reverse()
        .flat()
        .slice(0, 7000);

    if (final_data.some((i) => i > 65535)) {
        console.error('注入危险');
    }

    fs.writeFileSync('./data/sc.bin', new Uint16Array(final_data));
    console.log(final_data.map((i) => String.fromCodePoint(i)).join(' '));
}

/** 从 CSS 文件中获取字体 subsets 类型的数据 */
export function getSubsetsFromCSS(css: string) {
    const list = css.match(/@font-face[\s\S]+?\}/g);
    if (!list) return [];
    return list.map((face) => {
        const unicodeList = face.match(/unicode-range:([\s\S]*(?:[,;]))+/);
        if (!unicodeList) return [];
        const range = unicodeList[1];
        return range
            .split(/[,;]/)
            .map((i) => i.trim())
            .filter(Boolean)
            .map((i) => {
                i = i.replace('U+', '');
                if (i.includes('-')) {
                    return i.split('-').map((i) => parseInt('0x' + i)) as [
                        number,
                        number,
                    ];
                } else {
                    return parseInt('0x' + i);
                }
            });
    });
}
