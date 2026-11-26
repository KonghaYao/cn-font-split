#!/usr/bin/env node
//! 端到端（含写盘）benchmark：固定 NotoSerifSC + default / chunk-48k，
//! 每轮分别用内存 sink（outputFile 空实现）与真实 fs 写盘各跑一次，
//! 记录 compute / write / total、文件数与总字节，5 轮取中位数（丢弃 1 轮预热）。
//!
//! 配置固定为 `fontFeature=false`、`reporter=false`、`testHtml=true`：
//! 产品默认下 `fontFeature` 依赖 `analyze_cmap` 的反查，而 cmap 反转用
//! HashMap 迭代决定共享 glyph 归属，跨调用会随机移动少量字符；`reporter.bin`
//! 又内嵌每包耗时。两者都会让「两模式文件数/字节一致」的校验无法复跑。
//! 这里只关掉这两个不确定项，其余（含 testHtml）与默认一致，保证校验可重复。
//!
//! 前置：
//!   cargo build --release -p ffi
//!   pnpm -C packages/ffi-js build
//! 运行（仓库根目录）：
//!   CN_FONT_SPLIT_BIN=target/release/libffi.dylib \
//!     node packages/ffi-js/scripts/bench-e2e.mjs --rounds=1
//!
//! 输出：
//! - `bench-results/e2e-<label>/bench.json`
//! - `bench-results/e2e-<label>/bench.md`
//!
//! 计时口径：
//! - compute：调用开始 → 最后一个 outputFile 回调（原生计算 + 事件解码）
//! - write：最后一个回调 → fontSplit 结算（等待落盘排空；内存 sink 接近 0）
//! - total：调用开始 → fontSplit 结算
//! 写盘未 fsync，与默认实现保持一致。

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

const FONT = 'packages/demo/public/NotoSerifSC-Regular.ttf';
const CASES = [
    { name: 'default', chunkSize: undefined },
    { name: 'chunk-48k', chunkSize: 48 * 1024 },
];
// 见文件头：仅关闭两个会让产物跨调用不可比的不确定项。
const FIXED_CONFIG = {
    fontFeature: false,
    reporter: false,
    testHtml: true,
};

const parseArgs = () => {
    const options = {
        label: 'local',
        rounds: 5,
        warmup: 1,
        out: path.join(repoRoot, 'bench-results'),
    };
    const args = process.argv.slice(2);
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const eq = arg.indexOf('=');
        const key = eq === -1 ? arg : arg.slice(0, eq);
        const inline = eq === -1 ? undefined : arg.slice(eq + 1);
        const next = () => {
            if (inline !== undefined) return inline;
            i += 1;
            return args[i];
        };
        switch (key) {
            case '--label': {
                const value = next();
                if (value) options.label = value;
                break;
            }
            case '--rounds':
                options.rounds = Number.parseInt(next(), 10);
                break;
            case '--warmup':
                options.warmup = Number.parseInt(next(), 10);
                break;
            case '--out': {
                const value = next();
                if (value) options.out = path.resolve(repoRoot, value);
                break;
            }
            case '--help':
            case '-h':
                console.log(
                    '用法: node packages/ffi-js/scripts/bench-e2e.mjs ' +
                        '[--label <name>] [--rounds 5] [--warmup 1] [--out bench-results]',
                );
                process.exit(0);
                break;
            default:
                console.error(`忽略未知参数: ${arg}`);
        }
    }
    if (!Number.isFinite(options.rounds) || options.rounds < 1) {
        console.error(`--rounds 需要是 >= 1 的整数`);
        process.exit(2);
    }
    if (!Number.isFinite(options.warmup) || options.warmup < 0) {
        console.error(`--warmup 需要是 >= 0 的整数`);
        process.exit(2);
    }
    options.label = options.label.replace(/[^a-zA-Z0-9._-]/g, '-');
    return options;
};

const resolveBin = () => {
    const ext =
        process.platform === 'darwin'
            ? 'dylib'
            : process.platform === 'win32'
            ? 'dll'
            : 'so';
    const fallback = path.join(repoRoot, 'target/release', `libffi.${ext}`);
    const fromEnv = Boolean(process.env.CN_FONT_SPLIT_BIN);
    const bin = process.env.CN_FONT_SPLIT_BIN || fallback;
    process.env.CN_FONT_SPLIT_BIN = bin;
    if (!fs.existsSync(bin)) {
        const source = fromEnv ? 'CN_FONT_SPLIT_BIN' : '默认路径';
        console.error(
            `找不到 FFI 动态库（来自${source}）：${bin}\n` +
                `请先运行: cargo build --release -p ffi\n` +
                `或用 CN_FONT_SPLIT_BIN 指向 libffi 动态库（.dylib / .so / .dll）。`,
        );
        process.exit(2);
    }
    return bin;
};

const loadApi = () => {
    const entry = path.join(__dirname, '../dist/node/index.js');
    if (!fs.existsSync(entry)) {
        console.error(
            `找不到 Node FFI 入口: ${entry}\n` +
                `请先运行: pnpm -C packages/ffi-js build`,
        );
        process.exit(2);
    }
    try {
        const require = createRequire(import.meta.url);
        return require(entry);
    } catch (err) {
        console.error(
            `加载 Node FFI 入口失败: ${
                err instanceof Error ? err.message : err
            }\n` +
                `请确认 CN_FONT_SPLIT_BIN 指向的动态库可以加载，` +
                `并已运行 pnpm -C packages/ffi-js build。`,
        );
        process.exit(2);
    }
};

const displayPath = (target) => {
    const rel = path.relative(repoRoot, target);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : target;
};

const gitCommit = () => {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: repoRoot,
            encoding: 'utf8',
        }).trim();
    } catch {
        return 'unknown';
    }
};

const median = (values) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
};

const min = (values) => (values.length ? Math.min(...values) : 0);
const max = (values) => (values.length ? Math.max(...values) : 0);

const toBytes = (data) =>
    typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength;

const round3 = (value) => Math.round(value * 1000) / 1000;

const relativeName = (outDir, file) =>
    path.relative(outDir, file).split(path.sep).join('/');

const walkFiles = async (dir, base = dir, found = new Map()) => {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walkFiles(full, base, found);
        } else if (entry.isFile()) {
            const stat = await fsp.stat(full);
            found.set(relativeName(base, full), stat.size);
        }
    }
    return found;
};

/**
 * 跑一个 mode 的单轮。返回时间拆分与产物清单（文件名 → 字节数）。
 */
const runOnce = async ({
    fontSplit,
    fontBuffer,
    chunkSize,
    mode,
    caseName,
    round,
}) => {
    const outDir =
        mode === 'disk'
            ? await fsp.mkdtemp(
                  path.join(os.tmpdir(), `cn-font-split-e2e-${caseName}-`),
              )
            : path.join(
                  os.tmpdir(),
                  `cn-font-split-e2e-memory-${process.pid}-${caseName}-${round}`,
              );

    const files = new Map();
    let lastEventAt = 0;

    const outputFile = async (file, data) => {
        const name = relativeName(outDir, file);
        const bytes = toBytes(data);
        lastEventAt = performance.now();
        files.set(name, bytes);
        if (mode === 'memory') return;
        const target = path.join(outDir, name);
        await fsp.mkdir(path.dirname(target), { recursive: true });
        await fsp.writeFile(target, data);
    };

    const started = performance.now();
    try {
        await fontSplit({
            input: fontBuffer,
            outDir,
            chunkSize,
            ...FIXED_CONFIG,
            silent: true,
            outputFile,
        });
        const ended = performance.now();
        const computeMs = (lastEventAt || ended) - started;
        const writeMs = Math.max(0, ended - (lastEventAt || ended));
        const totalMs = ended - started;

        // 写盘模式以磁盘上的真实文件为准，内存模式以收到的数据为准。
        const actualFiles =
            mode === 'disk' ? await walkFiles(outDir) : new Map(files);

        return {
            mode,
            round,
            computeMs: round3(computeMs),
            writeMs: round3(writeMs),
            totalMs: round3(totalMs),
            fileCount: actualFiles.size,
            bytes: [...actualFiles.values()].reduce((a, b) => a + b, 0),
            files: actualFiles,
        };
    } finally {
        if (mode === 'disk') {
            await fsp.rm(outDir, { recursive: true, force: true });
        }
    }
};

const describeDiff = (baseline, other, caseName) => {
    const problems = [];
    if (baseline.fileCount !== other.fileCount) {
        problems.push(
            `文件数不一致: baseline=${baseline.fileCount} other=${other.fileCount}`,
        );
    }
    if (baseline.bytes !== other.bytes) {
        problems.push(
            `总字节不一致: baseline=${baseline.bytes} other=${other.bytes}`,
        );
    }
    const names = new Set([...baseline.files.keys(), ...other.files.keys()]);
    const mismatched = [];
    for (const name of names) {
        const a = baseline.files.get(name);
        const b = other.files.get(name);
        if (a !== b) mismatched.push(`${name}: ${a} vs ${b}`);
    }
    if (mismatched.length) {
        problems.push(
            `文件字节不一致 (${mismatched.length}): ${mismatched
                .slice(0, 5)
                .join(', ')}${mismatched.length > 5 ? ' ...' : ''}`,
        );
    }
    if (problems.length) {
        throw new Error(`[${caseName}] 产物不一致:\n${problems.join('\n')}`);
    }
};

const summarize = (runs) => ({
    computeMsMedian: round3(median(runs.map((run) => run.computeMs))),
    writeMsMedian: round3(median(runs.map((run) => run.writeMs))),
    totalMsMedian: round3(median(runs.map((run) => run.totalMs))),
    totalMsMin: round3(min(runs.map((run) => run.totalMs))),
    totalMsMax: round3(max(runs.map((run) => run.totalMs))),
    fileCount: runs[0].fileCount,
    bytes: runs[0].bytes,
});

const renderMarkdown = (report) => {
    const lines = [];
    lines.push(`# End-to-end benchmark: ${report.label}`);
    lines.push('');
    lines.push(`- commit: \`${report.commit}\``);
    lines.push(`- node: \`${report.node}\``);
    lines.push(`- platform: \`${report.platform}\``);
    lines.push(`- font: \`${report.font}\``);
    lines.push(
        `- config: \`${Object.entries(report.config)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ')}\``,
    );
    lines.push(
        `- rounds: ${report.rounds} measured + ${report.warmup} warmup（中位数）`,
    );
    lines.push(`- ffi: \`${report.bin}\``);
    lines.push(`- timestamp: \`${report.timestamp}\``);
    lines.push('');
    lines.push(
        '计时拆分：`compute` = 调用开始 → 最后一个 outputFile 回调；' +
            '`write` = 最后一个回调 → fontSplit 结算（等待落盘排空）；' +
            '`total` = 两者之和。写盘未 fsync。',
    );
    lines.push('');
    lines.push(
        '| case | mode | compute ms | write ms | total ms | total min/max | files | bytes |',
    );
    lines.push('| --- | --- | ---: | ---: | ---: | --- | ---: | ---: |');
    for (const item of report.cases) {
        for (const mode of ['memory', 'disk']) {
            const stat = item.modes[mode];
            lines.push(
                `| ${item.case} | ${mode} | ${stat.computeMsMedian.toFixed(
                    1,
                )} | ` +
                    `${stat.writeMsMedian.toFixed(
                        1,
                    )} | ${stat.totalMsMedian.toFixed(1)} | ` +
                    `${stat.totalMsMin.toFixed(1)}/${stat.totalMsMax.toFixed(
                        1,
                    )} | ` +
                    `${stat.fileCount} | ${stat.bytes} |`,
            );
        }
    }
    lines.push('');
    lines.push(
        '| case | memory total ms | disk total ms | 配对写盘开销 ms | 配对开销 % | 产物一致 |',
    );
    lines.push('| --- | ---: | ---: | ---: | ---: | --- |');
    for (const item of report.cases) {
        const memory = item.modes.memory.totalMsMedian;
        const disk = item.modes.disk.totalMsMedian;
        lines.push(
            `| ${item.case} | ${memory.toFixed(1)} | ${disk.toFixed(1)} | ` +
                `${item.overheadMsMedian.toFixed(1)} | ` +
                `${item.overheadPctMedian.toFixed(1)}% | ` +
                `${item.consistent ? 'yes' : 'no'} |`,
        );
    }
    lines.push('');
    lines.push(
        '说明：内存 sink 为空实现（仅统计产物），写盘模式的 files/bytes 来自磁盘实际落盘结果；' +
            '两者按文件名与字节数逐项一致才会通过校验（CSS header 含时间戳，只比大小不比内容）。',
    );
    lines.push('');
    lines.push(
        '配置固定 `fontFeature=false`、`reporter=false`：产品默认下 `analyze_cmap` 的 ' +
            'HashMap 反查会让少量字符跨调用换包，`reporter.bin` 又内嵌每包耗时，' +
            '都会破坏「两模式字节数一致」的可复跑校验。',
    );
    lines.push('');
    return lines.join('\n');
};

const main = async () => {
    const options = parseArgs();
    const bin = resolveBin();
    const binLabel = displayPath(bin);
    const { fontSplit } = loadApi();

    const fontPath = path.join(repoRoot, FONT);
    if (!fs.existsSync(fontPath)) {
        console.error(`找不到测试字体: ${fontPath}（请在仓库根目录运行）`);
        process.exit(2);
    }
    const fontBuffer = await fsp.readFile(fontPath);

    console.log(
        `font: ${FONT}\nconfig: ${Object.entries(FIXED_CONFIG)
            .map(([key, value]) => `${key}=${value}`)
            .join(', ')}\nbin: ${binLabel}\nrounds: ${options.rounds} (+${
            options.warmup
        } warmup)\n`,
    );

    const report = {
        label: options.label,
        commit: gitCommit(),
        node: process.version,
        platform: `${process.platform}-${process.arch}`,
        bin: binLabel,
        font: FONT,
        config: FIXED_CONFIG,
        rounds: options.rounds,
        warmup: options.warmup,
        timestamp: new Date().toISOString(),
        cases: [],
    };

    for (const testCase of CASES) {
        const runs = { memory: [], disk: [] };

        for (let round = 0; round < options.rounds + options.warmup; round++) {
            const warmup = round < options.warmup;
            const measuredRound = round - options.warmup;
            // 交替顺序，抵消「总是后跑」带来的系统偏差。
            const modes =
                measuredRound % 2 === 0
                    ? ['memory', 'disk']
                    : ['disk', 'memory'];
            for (const mode of warmup ? ['memory', 'disk'] : modes) {
                const result = await runOnce({
                    fontSplit,
                    fontBuffer,
                    chunkSize: testCase.chunkSize,
                    mode,
                    caseName: testCase.name,
                    round: measuredRound,
                });
                if (warmup) continue;
                runs[mode].push(result);
                console.log(
                    `${testCase.name} / ${mode} round ${measuredRound + 1}/${
                        options.rounds
                    }: ` +
                        `compute ${result.computeMs.toFixed(1)}ms, ` +
                        `write ${result.writeMs.toFixed(1)}ms, ` +
                        `total ${result.totalMs.toFixed(1)}ms, ` +
                        `${result.fileCount} files, ${result.bytes} bytes`,
                );
            }
        }

        const memoryCounts = new Set(
            runs.memory.map((run) => `${run.fileCount}/${run.bytes}`),
        );
        const diskCounts = new Set(
            runs.disk.map((run) => `${run.fileCount}/${run.bytes}`),
        );
        if (memoryCounts.size !== 1 || diskCounts.size !== 1) {
            throw new Error(
                `[${testCase.name}] 产物在轮次间不稳定: ` +
                    `memory=${[...memoryCounts].join('|')} disk=${[
                        ...diskCounts,
                    ].join('|')}`,
            );
        }
        const baseline = runs.memory[0];
        for (const run of [...runs.memory, ...runs.disk]) {
            describeDiff(baseline, run, testCase.name);
        }

        const memory = summarize(runs.memory);
        const disk = summarize(runs.disk);
        // describeDiff 已在上面逐项校验，这里记录汇总结果。
        const consistent =
            memory.fileCount === disk.fileCount && memory.bytes === disk.bytes;
        // 按轮配对后再取中位数，避免两侧独立中位数相减放大漂移。
        const overheads = runs.memory.map(
            (run, index) => runs.disk[index].totalMs - run.totalMs,
        );
        const overheadPct = runs.memory.map(
            (run, index) =>
                ((runs.disk[index].totalMs - run.totalMs) / run.totalMs) * 100,
        );

        report.cases.push({
            case: testCase.name,
            chunkSize: testCase.chunkSize ?? null,
            consistent,
            overheadMsMedian: round3(median(overheads)),
            overheadPctMedian: round3(median(overheadPct)),
            modes: {
                memory: {
                    ...memory,
                    rounds: runs.memory.map(({ files, ...rest }) => rest),
                },
                disk: {
                    ...disk,
                    rounds: runs.disk.map(({ files, ...rest }) => rest),
                },
            },
        });
    }

    const labelDir = path.join(options.out, `e2e-${options.label}`);
    await fsp.mkdir(labelDir, { recursive: true });
    const json = JSON.stringify(report, null, 2) + '\n';
    const md = renderMarkdown(report);
    await fsp.writeFile(path.join(labelDir, 'bench.json'), json);
    await fsp.writeFile(path.join(labelDir, 'bench.md'), md);
    console.log(`\n${md}`);
    console.log(`结果已写入 ${labelDir}`);
};

main().catch((err) => {
    console.error(err instanceof Error ? err.stack || err.message : err);
    process.exit(1);
});
