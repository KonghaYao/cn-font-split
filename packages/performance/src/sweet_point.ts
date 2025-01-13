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

    // 根据 sampleText 生成所需要拿到的实际字体分包
    const UsageAnalyzeData = sampleText.map((text) => {
        const chars = [...new Set([...text.content])]
            .map((i) => i.codePointAt(0))
            .filter(Boolean) as number[];
        const usageData = sampleReporter.map((mapper, index) => {
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
            return { usage: [...usage], splitSize: sample[index], miss };
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
                ).toFixed(2)}MiB`,
            ];
        });
        return {
            id: i.text.id,
            ...Object.fromEntries(entries),
        };
    });
    final.forEach((i) => {
        console.log('预设大小 / 均包 / 包数 / 总大小 ');
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

async function getAllReporter(id: number) {
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
