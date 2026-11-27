// 可发布性门禁：检查每个对外 npm 包的清单与构建产物是否满足发布要求。
// 私有包（private: true）不发布，跳过检查。
//
// 逐包断言：
//   1. version 等于根 Cargo.toml 的 [workspace.package].version（唯一真源）；
//   2. files 是非空数组；
//   3. 不存在 scripts.prepublish（npm pack/publish 不执行它，会把空 dist 发出去）；
//   4. main / module / types / bin 的每个取值指向的文件在磁盘上存在；
//   5. files 声明了 dist 的包，dist/ 存在且至少含一个文件；
//   6. font-analyze 必须同时声明 dist 与 data（构建脚本会改写为动态导入 data/）；
//   7. 主包 cn-font-split 的 optionalDependencies 不含 wasm32-* 包（8.0 起独立发布）。
//
// 前置：先执行根 `pnpm build` 生成各包的 dist。脚本不依赖 dist-platforms/（CI 中不存在）。
// 用法：
//   node ./script/check-publishable.mjs   全部就绪退出 0，否则打印问题并退出 1
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES_DIR = join(ROOT, 'packages');

/** 读取根 Cargo.toml 的 [workspace.package].version，退回 [package].version。 */
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
        console.error('无法从根 Cargo.toml 中读取版本号');
        process.exit(1);
    }
    return version;
}

/** 目录（递归）下是否至少有一个普通文件。 */
function containsFile(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isFile()) return true;
        if (entry.isDirectory() && containsFile(join(dir, entry.name))) return true;
    }
    return false;
}

/** 需要校验存在性的入口字段：`[[字段名, 相对路径], ...]`。 */
function entryFields(manifest) {
    const entries = [];
    for (const key of ['main', 'module', 'types']) {
        if (typeof manifest[key] === 'string') entries.push([key, manifest[key]]);
    }
    if (typeof manifest.bin === 'string') {
        entries.push(['bin', manifest.bin]);
    } else if (manifest.bin && typeof manifest.bin === 'object') {
        for (const [key, value] of Object.entries(manifest.bin)) {
            entries.push([`bin.${key}`, value]);
        }
    }
    return entries;
}

const version = readCargoVersion();

const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(PACKAGES_DIR, entry.name))
    .filter((dir) => existsSync(join(dir, 'package.json')))
    .sort();

const problems = [];
const checked = [];
let skipped = 0;

for (const dir of packageDirs) {
    const manifest = JSON.parse(
        readFileSync(join(dir, 'package.json'), 'utf8'),
    );

    if (manifest.private === true) {
        skipped += 1;
        continue;
    }

    const name = manifest.name ?? dir.slice(ROOT.length + 1);
    const add = (message) => problems.push(`${name}: ${message}`);
    const files = Array.isArray(manifest.files) ? manifest.files : null;

    // 1. 版本必须跟随根 Cargo.toml。
    if (manifest.version !== version) {
        add(
            `version 为 ${JSON.stringify(
                manifest.version,
            )}，应为 Cargo.toml 的 ${version}`,
        );
    }

    // 2. files 必须是非空数组（否则会把 src/、测试、tsconfig 一起发出去）。
    if (!files || files.length === 0) {
        add('缺少非空的 files 数组');
    }

    // 3. prepublish 在 npm pack/publish 下不执行，会把空 dist 发出去。
    if (manifest.scripts && 'prepublish' in manifest.scripts) {
        add('scripts.prepublish 仍存在，应改为 prepack');
    }

    // 4. 声明的入口文件必须真实存在。
    for (const [key, value] of entryFields(manifest)) {
        if (typeof value !== 'string' || value.trim() === '') {
            add(`${key} 不是有效路径`);
            continue;
        }
        if (!existsSync(join(dir, value))) {
            add(`${key} 指向的 ${value} 不存在（先执行 pnpm build）`);
        }
    }

    // 5. 声明了 dist 的包必须有构建产物。
    if (files && files.includes('dist')) {
        const dist = join(dir, 'dist');
        if (!existsSync(dist)) {
            add('files 声明了 dist，但 dist/ 不存在（先执行 pnpm build）');
        } else if (!statSync(dist).isDirectory()) {
            add('dist 不是目录');
        } else if (!containsFile(dist)) {
            add('dist/ 存在但没有任何文件');
        }
    }

    // 6. font-analyze 的构建脚本把字符集动态导入指向 ../../data/<file>，
    //    只发 dist 会在运行时报错。
    if (name === 'font-analyze') {
        for (const required of ['dist', 'data']) {
            if (!files || !files.includes(required)) {
                add(`files 必须同时包含 dist 与 data，缺少 ${required}`);
            }
        }
    }

    // 7. 8.0 起 wasm 平台包独立发布，不再随主包传递安装。
    if (name === 'cn-font-split') {
        const wasm = Object.keys(manifest.optionalDependencies ?? {}).filter(
            (dependency) => dependency.includes('wasm32-'),
        );
        if (wasm.length > 0) {
            add(
                `optionalDependencies 不应包含 wasm 平台包：${wasm.join(', ')}`,
            );
        }
    }

    checked.push(name);
}

if (problems.length > 0) {
    console.error(`可发布性检查失败（${problems.length} 项）：`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
}

console.log(
    `all ${checked.length} publishable package(s) are ready` +
        (skipped > 0 ? ` (${skipped} private package(s) skipped)` : ''),
);
