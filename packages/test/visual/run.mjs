//! 视觉回归基线（v7）：本地字体 + WebKit + 元素截图比对。
//!
//! 用法（在仓库根目录）：
//! ```sh
//! node packages/test/visual/run.mjs --update   # 首次生成基线
//! node packages/test/visual/run.mjs            # 校验
//! node packages/test/visual/run.mjs --case=cjk # 只跑单个用例
//! ```
//!
//! 依赖：
//! - 本地构建的 `target/release/libffi.{dylib,so,dll}`（或设置 `CN_FONT_SPLIT_BIN`）
//! - `packages/ffi-js/dist` 已构建
//! - Playwright WebKit 已安装
//!
//! 基线图放在 `packages/test/visual/baseline/`，只提交小集合。

import fs from 'fs-extra';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const fontDir = path.join(repoRoot, 'packages/demo/public');

const ext =
    process.platform === 'darwin'
        ? 'dylib'
        : process.platform === 'win32'
        ? 'dll'
        : 'so';
process.env.CN_FONT_SPLIT_BIN ||= path.join(
    repoRoot,
    'target/release',
    `libffi.${ext}`,
);

const CASES = [
    {
        name: 'cjk',
        font: 'NotoSerifSC-Regular.ttf',
        family: 'cjk-demo',
    },
    {
        name: 'vf',
        font: 'WorkSans-VariableFont_wght.ttf',
        family: 'vf-demo',
    },
    {
        name: 'smiley',
        font: 'SmileySans-Oblique.ttf',
        family: 'smiley-demo',
    },
];

const args = process.argv.slice(2);
const update = args.includes('--update');
const caseArg =
    args.find((a) => a.startsWith('--case='))?.split('=')[1] ??
    (args.includes('--case') ? args[args.indexOf('--case') + 1] : null);

const selected = CASES.filter((c) => !caseArg || c.name === caseArg);
if (selected.length === 0) {
    console.error(`没有匹配的用例: ${caseArg}`);
    process.exit(2);
}

if (!fs.existsSync(process.env.CN_FONT_SPLIT_BIN)) {
    console.error(
        `找不到 FFI 动态库: ${process.env.CN_FONT_SPLIT_BIN}\n` +
            `请先运行: cargo build --release -p ffi`,
    );
    process.exit(2);
}

// 必须在设置 CN_FONT_SPLIT_BIN 之后再加载 Node FFI 入口。
const { fontSplit } = await import('cn-font-split/dist/node/index.js');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
};

async function render(c) {
    const outDir = path.join(__dirname, 'out', c.name);
    fs.emptyDirSync(outDir);
    await fontSplit({
        outDir,
        input: path.join(fontDir, c.font),
        silent: true,
        reporter: false,
        testHTML: false,
        css: { fontFamily: c.family },
    });
}

async function startServer() {
    const server = http.createServer((req, res) => {
        const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
        const filePath = path.resolve(__dirname, '.' + urlPath);
        if (!filePath.startsWith(__dirname + path.sep)) {
            res.writeHead(403).end('forbidden');
            return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
            res.writeHead(404).end('not found');
            return;
        }
        res.writeHead(200, {
            'content-type':
                MIME[path.extname(filePath)] ?? 'application/octet-stream',
        });
        fs.createReadStream(filePath).pipe(res);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return server;
}

function compare(name, actualBuffer) {
    const baselinePath = path.join(__dirname, 'baseline', `${name}.png`);
    if (update) {
        fs.ensureDirSync(path.dirname(baselinePath));
        fs.writeFileSync(baselinePath, actualBuffer);
        console.log(`[update] ${path.relative(repoRoot, baselinePath)}`);
        return true;
    }
    if (!fs.existsSync(baselinePath)) {
        console.error(
            `缺少基线 ${path.relative(repoRoot, baselinePath)}，先运行 --update`,
        );
        return false;
    }
    const actual = PNG.sync.read(actualBuffer);
    const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
    if (
        actual.width !== baseline.width ||
        actual.height !== baseline.height
    ) {
        console.error(
            `[fail] ${name}: 尺寸变化 ${baseline.width}x${baseline.height} -> ${actual.width}x${actual.height}`,
        );
        return false;
    }
    const diff = new PNG({ width: actual.width, height: actual.height });
    const mismatched = pixelmatch(
        actual.data,
        baseline.data,
        diff.data,
        actual.width,
        actual.height,
        { threshold: 0.1 },
    );
    const ratio = mismatched / (actual.width * actual.height);
    const tempDir = path.join(__dirname, 'temp');
    fs.ensureDirSync(tempDir);
    fs.writeFileSync(
        path.join(tempDir, `${name}.actual.png`),
        actualBuffer,
    );
    if (ratio > 0.001) {
        fs.writeFileSync(
            path.join(tempDir, `${name}.diff.png`),
            PNG.sync.write(diff),
        );
        console.error(
            `[fail] ${name}: ${mismatched} pixels (${(ratio * 100).toFixed(3)}%)`,
        );
        return false;
    }
    console.log(`[pass] ${name}: ${(ratio * 100).toFixed(3)}% diff`);
    return true;
}

const server = await startServer();
const { port } = server.address();
const browser = await webkit.launch();
let ok = true;
try {
    const page = await browser.newPage({
        viewport: { width: 1000, height: 800 },
        deviceScaleFactor: 2,
    });
    const failed = [];
    page.on('response', (res) => {
        if (res.url().endsWith('.woff2') && !res.ok()) {
            failed.push(`${res.status()} ${res.url()}`);
        }
    });
    page.on('requestfailed', (req) => {
        failed.push(`${req.failure()?.errorText} ${req.url()}`);
    });
    for (const c of selected) {
        console.log(`[case] ${c.name} (${c.font})`);
        await render(c);
        failed.length = 0;
        await page.goto(`http://127.0.0.1:${port}/page.html?case=${c.name}`, {
            waitUntil: 'networkidle',
        });
        await page.waitForFunction(() => window.__ready === true, null, {
            timeout: 60_000,
        });
        const loaded = await page.evaluate(() => window.__fontsLoaded);
        if (!loaded) {
            throw new Error(`${c.name}: 没有成功加载任何字体`);
        }
        if (failed.length) {
            throw new Error(`${c.name}: 资源加载失败\n${failed.join('\n')}`);
        }
        const shot = await page.locator('#board').screenshot({
            animations: 'disabled',
        });
        ok = compare(c.name, shot) && ok;
    }
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
}

if (!ok) process.exitCode = 1;
