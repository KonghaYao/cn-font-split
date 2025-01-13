import { fontSplit, decodeReporter, proto } from 'cn-font-split/dist/bun';
import fs from 'fs-extra';

const sampleText: { id: string; content: string }[] = fs
    .readdirSync('./sample')
    .map((i) => {
        return {
            id: i,
            content: fs.readFileSync('./sample/' + i, 'utf-8'),
        };
    });
export async function main(build = false) {
    const input = '../demo/public/NotoSerifSC-Regular.ttf';
    const sample = generateNumbers(10, 100, 5);
    // 生成字体
    build &&
        sample.forEach((size) => {
            fontSplit({
                input,
                outDir: './build/' + size,
                chunkSize: size * 1024,
            });
        });
    // 拿到 unicode -> subset 的报告
    const sampleReporter: Mapper[] = [];
    for (const element of sample) {
        const reporter = await getAllReporter(element);
        const mapper = buildCMapForCssFromReporter(reporter);
        sampleReporter.push(mapper);
    }
    const textOnlyReporter: Map<string, Mapper> = new Map();
    for (const text of sampleText) {
        const chars = [...new Set([...text.content])]
            .map((i) => i.codePointAt(0))
            .filter(Boolean) as number[];
        await fontSplit({
            input,
            outDir: './build/mini/' + text.id,
            // chunkSize: 50 * 1024,
            subsets: [chars],
            languageAreas: false,
            subsetRemainChars: false,
            autoSubset: true,
            fontFeature: false,
            reduceMins: false,
        });
        await new Promise((res) => setTimeout(() => res(null), 100));
        const reporter = await getAllReporter('mini/' + text.id);
        const mapper = buildCMapForCssFromReporter(reporter);
        textOnlyReporter.set(text.id, mapper);
    }
    // 根据 sampleText 生成所需要拿到的实际字体分包
    const UsageAnalyzeData = sampleText.map((text) => {
        const chars = [...new Set([...text.content])]
            .map((i) => i.codePointAt(0))
            .filter(Boolean) as number[];
        const usageData = [
            ...sampleReporter,
            textOnlyReporter.get(text.id)!,
        ].map((mapper, index) => {
            let usage = new Set<proto.OutputReport.SubsetDetail>();
            let miss = 0;
            chars.forEach((char) => {
                const subset = mapper.get(char);
                if (subset) {
                    usage.add(subset);
                } else {
                    miss++;
                }
            });
            return {
                usage: [...usage],
                splitSize: sample[index] || 'mini',
                miss,
            };
        });
        return { text, usageData };
    });

    /**
     * 绘制 text 的表格
     *   id     | 10            | 20
     * text1  | avgSize/count | avgSize/count
     */
    const final = UsageAnalyzeData.map((i) => {
        const entries = i.usageData.map((data) => {
            const count = data.usage.length;
            const totalSize = data.usage.reduce(
                (col, cur) => col + cur.bytes,
                0,
            );
            return [
                data.splitSize,
                `${(totalSize / (count * 1024)).toFixed(0)}KiB / ${count} / ${(
                    totalSize /
                    (1024 * 1024)
                ).toFixed(2)}MiB ${data.miss}`,
            ];
        });
        return {
            id: i.text.id,
            ...Object.fromEntries(entries),
        };
    });

    console.log('预设大小 / 均包 / 包数 / 总大小 ');
    final.forEach((i) => {
        console.table(i);
    });
}

main();

type Mapper = Map<number, proto.OutputReport['subsetDetail'][number]>;

function buildCMapForCssFromReporter(reporter: proto.OutputReport) {
    const map: Mapper = new Map();
    reporter.subsetDetail.forEach((subset) => {
        subset.chars.forEach((unicode) => {
            map.set(unicode, subset);
        });
    });
    return map;
}

async function getAllReporter(id: number | string) {
    const buffer = await fs.promises.readFile(
        './build/' + id + '/reporter.bin',
    );
    const data = decodeReporter(buffer);
    return data;
}

function generateNumbers(min: number, max: number, interval: number): number[] {
    const start = min;
    const end = max;
    const result: number[] = [];

    for (let i = start; i <= end; i += interval) {
        result.push(i);
    }

    return result;
}
