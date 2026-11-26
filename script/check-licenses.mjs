// 校验所有对外 npm 包的许可证声明：license 字段必须为 Apache-2.0，且包目录下存在 LICENSE。
// 私有包（private: true）不发布，跳过检查。
// 用法：
//   node ./script/check-licenses.mjs   全绿退出 0，否则打印问题并退出 1
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_LICENSE = 'Apache-2.0';

if (!existsSync(join(ROOT, 'LICENSE'))) {
    console.error('根目录缺少 LICENSE');
    process.exit(1);
}

const PACKAGES_DIR = join(ROOT, 'packages');
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
    if (manifest.license !== EXPECTED_LICENSE) {
        problems.push(
            `${name}: license 为 ${JSON.stringify(
                manifest.license,
            )}，应为 ${EXPECTED_LICENSE}`,
        );
    }
    if (!existsSync(join(dir, 'LICENSE'))) {
        problems.push(`${name}: 缺少 LICENSE 文件`);
    }
    checked.push(name);
}

if (problems.length > 0) {
    console.error(`许可证校验失败（${problems.length} 项）：`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
}

console.log(
    `all ${checked.length} publishable package(s) are ${EXPECTED_LICENSE} with a LICENSE file` +
        (skipped > 0 ? ` (${skipped} private package(s) skipped)` : ''),
);
