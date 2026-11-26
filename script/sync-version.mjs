// 从根 Cargo.toml 读取版本号，同步到所有对外 npm 包的 package.json。
// 用法：
//   node ./script/sync-version.mjs          写入
//   node ./script/sync-version.mjs --check  仅校验，不一致时非零退出
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 对外 npm 包；packages/test 是私有包，版本固定 0.0.0，不在同步范围内。
const MANIFESTS = [
    'package.json',
    'packages/ffi-js/package.json',
    'packages/font-analyze/package.json',
    'packages/font-replacer/package.json',
    'packages/font-sharp/package.json',
    'packages/metrics/package.json',
    'packages/proto-to-cli/package.json',
    'packages/vite/package.json',
];

/** 读取 Cargo.toml 中的版本：优先 [workspace.package]，退回 [package]。 */
function readCargoVersion() {
    const lines = readFileSync(join(ROOT, 'Cargo.toml'), 'utf8').split(/\r?\n/);
    const versions = {};
    let section = '';
    for (const line of lines) {
        const header = line.match(/^\s*\[([^\]]+)\]\s*$/);
        if (header) {
            section = header[1].trim();
            continue;
        }
        if (section === 'workspace.package' || section === 'package') {
            const version = line.match(/^\s*version\s*=\s*"([^"]+)"/);
            if (version) versions[section] = version[1];
        }
    }
    const version = versions['workspace.package'] ?? versions.package;
    if (!version) {
        throw new Error('无法从根 Cargo.toml 中读取版本号');
    }
    return version;
}

/** 只替换顶层 "version" 字段的值，其余格式与缩进原样保留。 */
function rewriteVersion(text, version, file) {
    const pattern = /(^[ \t]*"version"[ \t]*:[ \t]*")([^"]*)(")/m;
    if (!pattern.test(text)) {
        throw new Error(`${file} 中找不到顶层 "version" 字段`);
    }
    const updated = text.replace(pattern, (_, head, _old, tail) => head + version + tail);
    const parsed = JSON.parse(updated);
    if (parsed.version !== version) {
        throw new Error(`${file} 版本写入失败`);
    }
    return updated;
}

const version = readCargoVersion();
const checkOnly = process.argv.includes('--check');
const mismatched = [];
let changed = 0;

for (const manifest of MANIFESTS) {
    const file = join(ROOT, manifest);
    const text = readFileSync(file, 'utf8');
    const current = JSON.parse(text).version;
    if (current === version) continue;

    if (checkOnly) {
        mismatched.push(`${manifest}: ${current} -> ${version}`);
        continue;
    }
    writeFileSync(file, rewriteVersion(text, version, manifest));
    changed += 1;
    console.log(`updated ${manifest}: ${current} -> ${version}`);
}

if (checkOnly) {
    if (mismatched.length > 0) {
        console.error(`版本不一致（Cargo.toml = ${version}）：`);
        for (const item of mismatched) console.error(`  ${item}`);
        process.exit(1);
    }
    console.log(`all ${MANIFESTS.length} package.json files are at ${version}`);
} else {
    console.log(
        changed === 0
            ? `all ${MANIFESTS.length} package.json files already at ${version}`
            : `synced ${changed} package.json file(s) to ${version}`,
    );
}
