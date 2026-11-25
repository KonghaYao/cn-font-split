#!/usr/bin/env node
//! FFI 错误冒烟：用乱码 buffer 调用，断言 Promise reject、进程不崩溃、错误文本可读。
//!
//! 前置：
//!   cargo build --release -p ffi
//!   cd packages/ffi-js && pnpm build
//! 运行（仓库根目录）：
//!   node packages/ffi-js/scripts/smoke-error.mjs

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

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cn-font-split-smoke-'));
const garbage = Buffer.from([
    0x13, 0x37, 0x00, 0x42, 0x99, 0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02,
]);

let rejected = null;
try {
    await fontSplit({ input: garbage, outDir, silent: true });
} catch (err) {
    rejected = err;
}

if (!rejected) {
    console.error('FAIL: 乱码 buffer 没有 reject');
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
}

const message = String(rejected.message ?? '').trim();
if (!message || message === 'undefined' || message.includes('[object')) {
    console.error(`FAIL: 错误文本不可读: ${JSON.stringify(message)}`);
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
}

// 错误之后库仍可继续使用：用合法字体跑一次真实构建。
const fixture = path.join(
    repoRoot,
    'packages/demo/public/WorkSans-VariableFont_wght.ttf',
);
try {
    await fontSplit({
        input: fixture,
        outDir,
        silent: true,
        chunkSize: 70 * 1024,
        testHtml: false,
        reporter: false,
    });
} catch (err) {
    console.error(`FAIL: 错误之后合法字体构建失败: ${err?.message ?? err}`);
    fs.rmSync(outDir, { recursive: true, force: true });
    process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });
console.log(`PASS: ${message}`);

// koffi 2.10.0 在 Node 24 的自然退出阶段会因自身 NAPI finalizer（RG::InstanceData
// 析构 -> napi_release_threadsafe_function）触发 SIGABRT。该问题与本次调用无关，
// 纯 koffi 注册一个回调即可复现（基线 dylib 同样复现），需要升级 koffi 才能根治。
// 断言已全部完成，这里显式以 0 退出，避免把上游 teardown 崩溃算到本次冒烟上。
process.exit(0);
