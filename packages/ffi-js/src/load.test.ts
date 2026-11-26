// node --test src/load.test.ts
import assert from 'node:assert';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { pathToFileURL } from 'node:url';
import {
    getPlatformPackageName,
    matchPlatform,
    resolveBinPath,
} from './load.ts';

test('multi-platform', () => {
    assert.strictEqual(
        matchPlatform('win32', 'x64', () => false),
        'x86_64-pc-windows-msvc',
    );
    assert.strictEqual(
        matchPlatform('win32', 'arm64', () => false),
        'aarch64-pc-windows-msvc',
    );
    assert.strictEqual(
        matchPlatform('darwin', 'x64', () => false),
        'x86_64-apple-darwin',
    );
    assert.strictEqual(
        matchPlatform('darwin', 'arm64', () => false),
        'aarch64-apple-darwin',
    );
    assert.strictEqual(
        matchPlatform('freebsd', 'x64', () => false),
        'x86_64-unknown-freebsd',
    );
    assert.strictEqual(
        matchPlatform('linux', 'x64', () => false),
        'x86_64-unknown-linux-gnu',
    );
    assert.strictEqual(
        matchPlatform('linux', 'arm64', () => false),
        'aarch64-unknown-linux-gnu',
    );
    assert.strictEqual(
        matchPlatform('linux', 'riscv64', () => false),
        'riscv64gc-unknown-linux-gnu',
    );
    assert.strictEqual(
        matchPlatform('linux', 's390x', () => false),
        's390x-unknown-linux-gnu',
    );
    assert.strictEqual(
        matchPlatform('linux', 'x64', () => true),
        'wasm32-wasip1',
    );
    assert.strictEqual(
        matchPlatform('linux', 'arm64', () => true),
        'wasm32-wasip1',
    );
    assert.strictEqual(
        matchPlatform('linux', 'riscv64', () => true),
        'wasm32-wasip1',
    );
    assert.strictEqual(
        matchPlatform('android', 'arm64', () => false),
        'wasm32-wasip1',
    );
    assert.strictEqual(
        matchPlatform('android', 'arm', () => false),
        'wasm32-wasip1',
    );
    assert.strictEqual(
        matchPlatform('win32', 'ia32', () => false),
        'wasm32-wasip1',
    );
});

test('platform package name', () => {
    assert.strictEqual(
        getPlatformPackageName('darwin', 'arm64', () => false),
        'darwin-arm64',
    );
    assert.strictEqual(
        getPlatformPackageName('darwin', 'x64', () => false),
        'darwin-x64',
    );
    assert.strictEqual(
        getPlatformPackageName('win32', 'x64', () => false),
        'win32-x64-msvc',
    );
    assert.strictEqual(
        getPlatformPackageName('win32', 'arm64', () => false),
        'win32-arm64-msvc',
    );
    assert.strictEqual(
        getPlatformPackageName('linux', 'x64', () => false),
        'linux-x64-gnu',
    );
    assert.strictEqual(
        getPlatformPackageName('linux', 'arm64', () => false),
        'linux-arm64-gnu',
    );
    // musl / 其它架构没有预编译包，只能走 CN_FONT_SPLIT_BIN。
    assert.strictEqual(
        getPlatformPackageName('linux', 'x64', () => true),
        null,
    );
    assert.strictEqual(
        getPlatformPackageName('android', 'arm64', () => false),
        null,
    );
    assert.strictEqual(
        getPlatformPackageName('win32', 'ia32', () => false),
        null,
    );
});

/**
 * 临时目录，realpath 之后返回。
 * macOS 的 os.tmpdir() 位于 /var（指向 /private/var），而 require.resolve 会解析软链，
 * 不做 realpath 会让「期望路径」和「解析结果」在字符串比较时不等。
 */
const makeTempDir = (t: TestContext) => {
    const dir = fs.realpathSync(
        fs.mkdtempSync(path.join(os.tmpdir(), 'cn-font-split-load-')),
    );
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    return dir;
};

/** 在 dir 下写一个空的动态库占位文件，返回绝对路径。 */
const writeBin = (dir: string, binName: string) => {
    const file = path.join(dir, binName);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '');
    return file;
};

const readError = (fn: () => unknown): Error => {
    try {
        fn();
    } catch (error) {
        return error as Error;
    }
    throw new Error('期望 resolveBinPath 抛错，但它返回了结果');
};

test('resolveBinPath: CN_FONT_SPLIT_BIN 优先级最高', () => {
    // 即使平台包可以解析成功，也必须直接返回 env 覆盖值。
    const result = resolveBinPath({
        env: { CN_FONT_SPLIT_BIN: '/custom/libffi.dylib' },
        platform: 'darwin',
        arch: 'arm64',
        isMusl: () => false,
        resolve: () => {
            throw new Error('设置了 CN_FONT_SPLIT_BIN 时不应解析平台包');
        },
        exists: () => {
            throw new Error('设置了 CN_FONT_SPLIT_BIN 时不应检查文件');
        },
    });
    assert.strictEqual(result, '/custom/libffi.dylib');
});

test('resolveBinPath: 命中平台包（临时 node_modules + createRequire）', (t) => {
    const root = makeTempDir(t);
    const packageDir = path.join(
        root,
        'node_modules',
        '@cn-font-split',
        'darwin-arm64',
    );
    fs.mkdirSync(packageDir, { recursive: true });
    fs.writeFileSync(
        path.join(packageDir, 'package.json'),
        JSON.stringify({
            name: '@cn-font-split/darwin-arm64',
            version: '8.0.0',
            main: 'libffi-aarch64-apple-darwin.dylib',
        }),
    );
    const expected = writeBin(packageDir, 'libffi-aarch64-apple-darwin.dylib');

    const moduleUrl = pathToFileURL(path.join(root, 'src', 'load.ts')).href;
    const require = createRequire(moduleUrl);
    const calls: string[] = [];
    const result = resolveBinPath({
        env: {},
        platform: 'darwin',
        arch: 'arm64',
        isMusl: () => false,
        moduleUrl,
        distDir: path.join(root, 'dist'),
        resolve: (specifier) => {
            calls.push(specifier);
            return require.resolve(specifier);
        },
    });

    assert.deepStrictEqual(calls, ['@cn-font-split/darwin-arm64']);
    assert.strictEqual(result, expected);
});

test('resolveBinPath: 平台包缺失时回退本地 dist', (t) => {
    const root = makeTempDir(t);
    const moduleUrl = pathToFileURL(path.join(root, 'src', 'load.ts')).href;
    const expected = writeBin(
        path.join(root, 'dist'),
        'libffi-aarch64-apple-darwin.dylib',
    );

    // 不注入 resolve：走真实的 createRequire，node_modules 不存在必然解析失败。
    const result = resolveBinPath({
        env: {},
        platform: 'darwin',
        arch: 'arm64',
        isMusl: () => false,
        moduleUrl,
    });

    assert.strictEqual(result, expected);
});

test('resolveBinPath: 全部失败时报错列出所有尝试项', (t) => {
    const root = makeTempDir(t);
    const moduleUrl = pathToFileURL(path.join(root, 'src', 'load.ts')).href;
    const localPath = path.join(
        root,
        'dist',
        'libffi-aarch64-apple-darwin.dylib',
    );

    const error = readError(() =>
        resolveBinPath({
            env: {},
            platform: 'darwin',
            arch: 'arm64',
            isMusl: () => false,
            moduleUrl,
        }),
    );
    const message = error.message;

    assert.match(message, /cn-font-split 找不到可用的动态库/);
    assert.match(message, /当前平台：darwin-arm64/);
    assert.match(message, /已尝试：/);
    assert.match(message, /CN_FONT_SPLIT_BIN（未设置）/);
    assert.match(
        message,
        /@cn-font-split\/darwin-arm64（平台包未安装或无法解析/,
    );
    assert.ok(
        message.includes(localPath),
        `错误信息应包含本地回退路径 ${localPath}，实际为：\n${message}`,
    );
    assert.match(
        message,
        /请安装对应的可选平台包：npm install @cn-font-split\/darwin-arm64/,
    );
});

test('resolveBinPath: musl 等无平台包的情况提示用 CN_FONT_SPLIT_BIN', (t) => {
    const root = makeTempDir(t);
    const error = readError(() =>
        resolveBinPath({
            env: {},
            platform: 'linux',
            arch: 'x64',
            isMusl: () => true,
            moduleUrl: pathToFileURL(path.join(root, 'src', 'load.ts')).href,
        }),
    );
    const message = error.message;

    assert.match(
        message,
        /当前平台：linux-x64（Rust target：wasm32-wasip1，无预编译平台包）/,
    );
    assert.match(message, /没有预编译平台包（musl \/ android \/ 32 位等）/);
    assert.match(
        message,
        /只能通过 CN_FONT_SPLIT_BIN 指向自编译的 libffi 动态库/,
    );
    // 没有平台包时不应尝试解析任何 @cn-font-split/* 包。
    assert.ok(!message.includes('@cn-font-split/'));
});

test('resolveBinPath: 默认实现从 process.env 读取 CN_FONT_SPLIT_BIN', () => {
    const previous = process.env.CN_FONT_SPLIT_BIN;
    process.env.CN_FONT_SPLIT_BIN = '/tmp/cn-font-split-default-env.dylib';
    try {
        assert.strictEqual(
            resolveBinPath(),
            '/tmp/cn-font-split-default-env.dylib',
        );
    } finally {
        if (previous === undefined) {
            delete process.env.CN_FONT_SPLIT_BIN;
        } else {
            process.env.CN_FONT_SPLIT_BIN = previous;
        }
    }
});
