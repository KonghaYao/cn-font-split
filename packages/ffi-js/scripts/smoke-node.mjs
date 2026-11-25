#!/usr/bin/env node
//! Node FFI 冒烟：用仓库内本地字体跑一次真实构建，断言产物落盘。
//!
//! 前置：
//!   cargo build --release -p ffi
//!   cd packages/ffi-js && pnpm build
//! 运行（仓库根目录）：
//!   node packages/ffi-js/scripts/smoke-node.mjs

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');

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

if (!fs.existsSync(process.env.CN_FONT_SPLIT_BIN)) {
    console.error(
        `找不到 FFI 动态库: ${process.env.CN_FONT_SPLIT_BIN}\n` +
            `请先运行: cargo build --release -p ffi`,
    );
    process.exit(2);
}

// 必须在设置 CN_FONT_SPLIT_BIN 之后再加载 Node FFI 入口。
const { fontSplit } = await import('../dist/node/index.js');

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-font-split-node-'));
const fixture = path.join(
    repoRoot,
    'packages/demo/public/WorkSans-VariableFont_wght.ttf',
);

try {
    await fontSplit({
        input: fixture,
        outDir,
        silent: true,
        reporter: false,
        testHTML: false,
        css: { fontFamily: 'smoke-demo' },
    });

    const files = fs.readdirSync(outDir);
    const woff2 = files.filter((name) => name.endsWith('.woff2'));
    const css = files.find((name) => name.endsWith('.css'));
    if (woff2.length === 0) {
        throw new Error(`没有生成 woff2，产物: ${files.join(', ')}`);
    }
    if (!css) {
        throw new Error(`没有生成 CSS，产物: ${files.join(', ')}`);
    }
    const empty = woff2.filter(
        (name) => fs.statSync(path.join(outDir, name)).size === 0,
    );
    if (empty.length) {
        throw new Error(`存在空 woff2: ${empty.join(', ')}`);
    }
    console.log(
        `PASS: ${woff2.length} 个 woff2 + ${css}（${files.length} 个文件）`,
    );
} finally {
    fs.rmSync(outDir, { recursive: true, force: true });
}
