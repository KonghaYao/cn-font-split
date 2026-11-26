#!/usr/bin/env node
//! 从 Rust 产物生成可发布的平台包目录（dist-platforms/<platform>/）。
//!
//! 用法（仓库根目录）：
//!   node scripts/build-platforms.mjs                     # 默认本机平台
//!   node scripts/build-platforms.mjs --platform darwin-arm64
//!   node scripts/build-platforms.mjs --all               # 所有已构建产物的平台
//!   node scripts/build-platforms.mjs --all --artifacts-dir artifacts
//!                                                        # 从 GitHub artifact 下载目录取产物
//!
//! --artifacts-dir <dir> 是可选的最高优先级来源，对应 `actions/download-artifact`
//! （pattern: bindings-*，merge-multiple: true）落地后的扁平目录。相对路径按仓库
//! 根目录解析。不传该参数时行为与改动前完全一致。
//!
//! 产物来源（按顺序查找）：
//!   <artifacts-dir>/libffi-<triple>.<ext>      （仅传入 --artifacts-dir 时）
//!   target/<triple>/release/libffi-<triple>.<ext>
//!   target/<triple>/release/libffi.<ext>
//!   target/<triple>/release/ffi.<ext>          （Windows 原始产物）
//!   target/release/libffi.<ext>                （本机直接 cargo build）
//!   target/<triple>/release/wasm_edge[.Oz].wasm（wasm）
//!
//! 生成的目录只用于本地 pack/publish，不提交到仓库（见 .gitignore）。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(ROOT, 'dist-platforms');

/** 8 个对外平台包。key 即包名后缀与产物目录名。 */
const PLATFORMS = {
    'darwin-arm64': {
        triple: 'aarch64-apple-darwin',
        ext: 'dylib',
        os: ['darwin'],
        cpu: ['arm64'],
    },
    'darwin-x64': {
        triple: 'x86_64-apple-darwin',
        ext: 'dylib',
        os: ['darwin'],
        cpu: ['x64'],
    },
    'win32-x64-msvc': {
        triple: 'x86_64-pc-windows-msvc',
        ext: 'dll',
        os: ['win32'],
        cpu: ['x64'],
    },
    'win32-arm64-msvc': {
        triple: 'aarch64-pc-windows-msvc',
        ext: 'dll',
        os: ['win32'],
        cpu: ['arm64'],
    },
    'linux-x64-gnu': {
        triple: 'x86_64-unknown-linux-gnu',
        ext: 'so',
        os: ['linux'],
        cpu: ['x64'],
        libc: ['glibc'],
    },
    'linux-arm64-gnu': {
        triple: 'aarch64-unknown-linux-gnu',
        ext: 'so',
        os: ['linux'],
        cpu: ['arm64'],
        libc: ['glibc'],
    },
    'wasm32-wasip1': {
        triple: 'wasm32-wasip1',
        ext: 'wasm',
        os: ['darwin', 'linux', 'win32'],
        cpu: ['x64', 'arm64'],
    },
    'wasm32-wasip2': {
        triple: 'wasm32-wasip2',
        ext: 'wasm',
        os: ['darwin', 'linux', 'win32'],
        cpu: ['x64', 'arm64'],
    },
};

function readVersion() {
    const cargo = fs.readFileSync(path.join(ROOT, 'Cargo.toml'), 'utf8');
    const workspace = cargo.match(
        /\[workspace\.package\][^[]*?^\s*version\s*=\s*"([^"]+)"/m,
    );
    if (workspace) return workspace[1];
    const pkg = cargo.match(/\[package\][^[]*?^\s*version\s*=\s*"([^"]+)"/m);
    if (pkg) return pkg[1];
    throw new Error('无法从根 Cargo.toml 读取版本号');
}

function isMusl() {
    if (process.platform !== 'linux') return false;
    try {
        const report = process.report?.getReport?.();
        if (report?.header?.glibcVersionRuntime) return false;
        return (report?.sharedObjects ?? []).some(
            (f) => f.includes('libc.musl-') || f.includes('ld-musl-'),
        );
    } catch {
        return false;
    }
}

function hostPlatform() {
    const arch = process.arch;
    if (process.platform === 'darwin') {
        if (arch === 'arm64') return 'darwin-arm64';
        if (arch === 'x64') return 'darwin-x64';
        return null;
    }
    if (process.platform === 'win32') {
        if (arch === 'x64') return 'win32-x64-msvc';
        if (arch === 'arm64') return 'win32-arm64-msvc';
        return null;
    }
    if (process.platform === 'linux') {
        if (isMusl()) return null;
        if (arch === 'x64') return 'linux-x64-gnu';
        if (arch === 'arm64') return 'linux-arm64-gnu';
        return null;
    }
    return null;
}

function isNative(platform) {
    return platform.triple === hostTriple();
}

function hostTriple() {
    const arch =
        process.arch === 'arm64'
            ? 'aarch64'
            : process.arch === 'x64'
            ? 'x86_64'
            : null;
    if (!arch) return null;
    if (process.platform === 'darwin') return `${arch}-apple-darwin`;
    if (process.platform === 'win32') return `${arch}-pc-windows-msvc`;
    if (process.platform === 'linux') return `${arch}-unknown-linux-gnu`;
    return null;
}

/** 查找某平台可用的构建产物。 */
function findArtifact(key, platform, artifactsDir) {
    const { triple, ext } = platform;
    const releaseDir = path.join(ROOT, 'target', triple, 'release');
    const candidates = [];
    if (artifactsDir) {
        // GitHub artifact 下载后的布局：artifacts/libffi-<triple>.<ext>。
        candidates.push(path.join(artifactsDir, `libffi-${triple}.${ext}`));
    }
    if (ext === 'wasm') {
        candidates.push(
            path.join(releaseDir, `libffi-${triple}.wasm`),
            path.join(releaseDir, 'libffi.wasm'),
            path.join(releaseDir, 'wasm_edge.Oz.wasm'),
            path.join(releaseDir, 'wasm_edge.wasm'),
        );
    } else {
        candidates.push(
            path.join(releaseDir, `libffi-${triple}.${ext}`),
            path.join(releaseDir, `libffi.${ext}`),
            path.join(releaseDir, `ffi.${ext}`),
        );
        if (isNative(platform)) {
            const nativeDir = path.join(ROOT, 'target/release');
            candidates.push(
                path.join(nativeDir, `libffi.${ext}`),
                path.join(nativeDir, `ffi.${ext}`),
            );
        }
    }
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

function buildOne(key, version, artifactsDir) {
    const platform = PLATFORMS[key];
    if (!platform) {
        throw new Error(
            `未知平台 "${key}"，可用：${Object.keys(PLATFORMS).join(', ')}`,
        );
    }
    const artifact = findArtifact(key, platform, artifactsDir);
    if (!artifact) {
        const sources = artifactsDir
            ? `--artifacts-dir 下的 libffi-${platform.triple}.${platform.ext}、target/${platform.triple}/release/ 或 target/release/ 下的 ${platform.ext} 产物`
            : `target/${platform.triple}/release/ 或 target/release/ 下的 ${platform.ext} 产物`;
        console.error(`[skip] ${key}: 找不到 ${sources}`);
        return false;
    }
    const outDir = path.join(OUT_ROOT, key);
    const binName = `libffi-${platform.triple}.${platform.ext}`;
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    fs.copyFileSync(artifact, path.join(outDir, binName));

    const manifest = {
        name: `@cn-font-split/${key}`,
        version,
        description: `cn-font-split native binding for ${platform.triple}`,
        license: 'Apache-2.0',
        repository: {
            type: 'git',
            url: 'git+https://github.com/KonghaYao/cn-font-split.git',
        },
        os: platform.os,
        cpu: platform.cpu,
        ...(platform.libc ? { libc: platform.libc } : {}),
        main: binName,
        files: [binName],
        publishConfig: {
            registry: 'https://registry.npmjs.org/',
            access: 'public',
        },
    };
    fs.writeFileSync(
        path.join(outDir, 'package.json'),
        JSON.stringify(manifest, null, 4) + '\n',
    );
    console.log(
        `[ok] ${key}: ${path.relative(ROOT, artifact)} -> ${path.relative(
            ROOT,
            path.join(outDir, binName),
        )}`,
    );
    return true;
}

const argv = process.argv.slice(2);
const getArg = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
};
const version = readVersion();
const artifactsDirArg = getArg('--artifacts-dir');
if (
    argv.includes('--artifacts-dir') &&
    (!artifactsDirArg || artifactsDirArg.startsWith('--'))
) {
    console.error(
        '--artifacts-dir 需要一个目录参数，例如：--artifacts-dir artifacts',
    );
    process.exit(2);
}
const artifactsDir = artifactsDirArg
    ? path.resolve(ROOT, artifactsDirArg)
    : undefined;
if (artifactsDir && !fs.existsSync(artifactsDir)) {
    console.error(`--artifacts-dir 指向的目录不存在：${artifactsDir}`);
    process.exit(2);
}
const selected = argv.includes('--all')
    ? Object.keys(PLATFORMS)
    : [getArg('--platform') ?? hostPlatform()].filter(Boolean);

if (selected.length === 0) {
    const host = `${process.platform}-${process.arch}`;
    console.error(
        `当前平台 ${host} 没有对应的预编译包。\n` +
            `请用 --platform 指定 ${Object.keys(PLATFORMS).join(
                ', ',
            )} 之一，或设置 CN_FONT_SPLIT_BIN。`,
    );
    process.exit(2);
}

console.log(`cn-font-split ${version} platform packages -> dist-platforms/`);
if (artifactsDir) {
    const rel = path.relative(ROOT, artifactsDir) || '.';
    console.log(`产物优先从 --artifacts-dir 读取：${rel}`);
}
let built = 0;
for (const key of selected) {
    if (buildOne(key, version, artifactsDir)) built += 1;
}

// 只做提示，不修改任何发布配置。
if (built === 0) {
    console.error('没有生成任何平台包。');
    process.exit(1);
}
