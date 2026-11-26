// 从根 Cargo.toml 读取版本号，同步到所有对外分发的包的清单文件。
// 同步范围：
//   1. 对外 npm 包 package.json（清单见 MANIFESTS）的顶层 "version"；
//   2. 这些 package.json 的 "optionalDependencies" 中所有 `@cn-font-split/*`
//      平台包依赖（主包通过它们分发原生二进制，版本必须与主包严格一致）；
//   3. packages/ffi-py/setup.py 中 setup(version="x.y.z") 的版本字符串。
// 其余字段、键顺序、缩进与换行原样保留，因此同样可以用于 --check 的前后对比。
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

// Python 包入口：版本写在 setup.py 的 setup(version="x.y.z") 关键字参数里。
const SETUP_PY = 'packages/ffi-py/setup.py';
const SETUP_VERSION = /^([ \t]*version[ \t]*=[ \t]*")([^"]*)(")/m;

// 平台包作用域：optionalDependencies 里只有这些条目需要跟随主包版本。
const PLATFORM_SCOPE = '@cn-font-split/';

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

/** 需要跟随主包版本的 optionalDependencies 键。 */
function platformDependencyNames(manifest) {
    return Object.keys(manifest.optionalDependencies ?? {}).filter((name) =>
        name.startsWith(PLATFORM_SCOPE),
    );
}

/**
 * 找到顶层 `"key": { ... }` 对象块在文本中的 [start, end) 区间。
 * 只做花括号配对，跳过字符串内的括号；找不到时返回 null。
 */
function findObjectBlock(text, key) {
    const head = new RegExp(`^[ \\t]*"${key}"[ \\t]*:[ \\t]*\\{`, 'm').exec(text);
    if (!head) return null;
    const start = head.index + head[0].length - 1;
    let depth = 0;
    let inString = false;
    for (let i = start; i < text.length; i += 1) {
        const char = text[i];
        if (inString) {
            if (char === '\\') i += 1;
            else if (char === '"') inString = false;
            continue;
        }
        if (char === '"') inString = true;
        else if (char === '{') depth += 1;
        else if (char === '}') {
            depth -= 1;
            if (depth === 0) return { start, end: i + 1 };
        }
    }
    throw new Error(`"${key}" 的对象块没有闭合`);
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 只替换顶层 "version" 字段的值，其余格式与缩进原样保留。 */
function rewriteVersion(text, version, file) {
    const pattern = /(^[ \t]*"version"[ \t]*:[ \t]*")([^"]*)(")/m;
    if (!pattern.test(text)) {
        throw new Error(`${file} 中找不到顶层 "version" 字段`);
    }
    return text.replace(pattern, (_, head, _old, tail) => head + version + tail);
}

/**
 * 把 optionalDependencies 里 `@cn-font-split/*` 的值改写到当前版本。
 * 逐条按 `"name": "value"` 精确替换，保留原有缩进、顺序与尾随内容。
 */
function rewriteOptionalDependencies(text, version, file, names) {
    if (names.length === 0) return text;
    const block = findObjectBlock(text, 'optionalDependencies');
    if (!block) {
        throw new Error(`${file} 中找不到 optionalDependencies，但存在平台包依赖`);
    }
    let segment = text.slice(block.start, block.end);
    for (const name of names) {
        const pattern = new RegExp(
            `("${escapeRegExp(name)}"[ \\t]*:[ \\t]*")([^"]*)(")`,
        );
        if (!pattern.test(segment)) {
            throw new Error(
                `${file} 的 optionalDependencies 中找不到 ${name}`,
            );
        }
        segment = segment.replace(
            pattern,
            (_, head, _old, tail) => head + version + tail,
        );
    }
    return text.slice(0, block.start) + segment + text.slice(block.end);
}

/** 当前文本相对目标版本的偏差列表；空数组表示已同步。 */
function collectDrift(manifest, names, version) {
    const drift = [];
    if (manifest.version !== version) {
        drift.push(`version: ${manifest.version} -> ${version}`);
    }
    for (const name of names) {
        const current = manifest.optionalDependencies[name];
        if (current !== version) {
            drift.push(`${name}: ${current} -> ${version}`);
        }
    }
    return drift;
}

/** 写入后自检：版本与全部平台包依赖都必须等于目标版本。 */
function rewriteManifest(text, version, file, names) {
    const updated = rewriteOptionalDependencies(
        rewriteVersion(text, version, file),
        version,
        file,
        names,
    );
    const parsed = JSON.parse(updated);
    const drift = collectDrift(parsed, names, version);
    if (drift.length > 0) {
        throw new Error(`${file} 版本写入失败：${drift.join('; ')}`);
    }
    return updated;
}

/** 读取 setup.py 中 setup(version="...") 的版本字符串。 */
function readSetupVersion(text, file) {
    const match = SETUP_VERSION.exec(text);
    if (!match) throw new Error(`${file} 中找不到 version="..." 字段`);
    return match[2];
}

/**
 * 只替换 setup.py 的 `version="x.y.z"` 一行，其余格式原样保留。
 * setup() 里应当只有一个 version 关键字参数；多于一个说明结构已变化，直接报错。
 */
function rewriteSetup(text, version, file) {
    const occurrences = text.match(/^[ \t]*version[ \t]*=[ \t]*"[^"]*"/gm) ?? [];
    if (occurrences.length !== 1) {
        throw new Error(
            `${file} 中应有且仅有一个 version="..." 字段，实际 ${occurrences.length} 个`,
        );
    }
    const updated = text.replace(
        SETUP_VERSION,
        (_, head, _old, tail) => head + version + tail,
    );
    if (readSetupVersion(updated, file) !== version) {
        throw new Error(`${file} 版本写入失败`);
    }
    return updated;
}

const version = readCargoVersion();
const checkOnly = process.argv.includes('--check');
const mismatched = [];
let changedManifests = 0;
let changedSetup = 0;

for (const manifestPath of MANIFESTS) {
    const file = join(ROOT, manifestPath);
    const text = readFileSync(file, 'utf8');
    const manifest = JSON.parse(text);
    const names = platformDependencyNames(manifest);
    const drift = collectDrift(manifest, names, version);
    if (drift.length === 0) continue;

    if (checkOnly) {
        for (const item of drift) mismatched.push(`${manifestPath}: ${item}`);
        continue;
    }
    writeFileSync(file, rewriteManifest(text, version, manifestPath, names));
    changedManifests += 1;
    console.log(`updated ${manifestPath}: ${drift.join('; ')}`);
}

// setup.py 不是 JSON，按行同步，冲突项沿用 package.json 的输出格式。
const setupFile = join(ROOT, SETUP_PY);
const setupText = readFileSync(setupFile, 'utf8');
const setupVersion = readSetupVersion(setupText, SETUP_PY);
if (setupVersion !== version) {
    const drift = `version: ${setupVersion} -> ${version}`;
    if (checkOnly) {
        mismatched.push(`${SETUP_PY}: ${drift}`);
    } else {
        writeFileSync(setupFile, rewriteSetup(setupText, version, SETUP_PY));
        changedSetup += 1;
        console.log(`updated ${SETUP_PY}: ${drift}`);
    }
}

const scope = `${MANIFESTS.length} package.json files + ${SETUP_PY}`;

if (checkOnly) {
    if (mismatched.length > 0) {
        console.error(`版本不一致（Cargo.toml = ${version}）：`);
        for (const item of mismatched) console.error(`  ${item}`);
        process.exit(1);
    }
    console.log(
        `all ${scope} are at ${version} (version + ${PLATFORM_SCOPE}* optionalDependencies)`,
    );
} else {
    const changed = changedManifests + changedSetup;
    if (changed === 0) {
        console.log(`all ${scope} already at ${version}`);
    } else {
        const parts = [];
        if (changedManifests > 0) parts.push(`${changedManifests} package.json`);
        if (changedSetup > 0) parts.push(SETUP_PY);
        console.log(`synced ${changed} file(s) to ${version}: ${parts.join(' + ')}`);
    }
}
