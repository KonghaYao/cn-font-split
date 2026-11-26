import fs from 'fs-extra';
import { exec } from 'child_process';
import assert from 'assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const binExt =
    process.platform === 'darwin'
        ? 'dylib'
        : process.platform === 'win32'
        ? 'dll'
        : 'so';

// 直接使用本地构建的 FFI，不依赖已发布的平台包。
const env = {
    ...process.env,
    CN_FONT_SPLIT_BIN:
        process.env.CN_FONT_SPLIT_BIN ??
        path.join(repoRoot, 'target/release', `libffi.${binExt}`),
};

if (!fs.existsSync(env.CN_FONT_SPLIT_BIN)) {
    console.error(
        `找不到 FFI 动态库: ${env.CN_FONT_SPLIT_BIN}\n` +
            '请先运行: cargo build --release -p ffi',
    );
    process.exit(2);
}

// 执行 pnpm vite build 并检查
fs.emptyDirSync('./node_modules/.vite');
fs.emptyDirSync('./node_modules/.cache');

await new Promise((res, rej) => {
    exec(
        'pnpm vite build -c vite.config.test.mts',
        { cwd: process.cwd(), env },
        (err, stdout, stderr) => {
            if (err) {
                rej(err);
                return;
            }
            res(`stdout: ${stdout}`);
        },
    );
});

const cacheRoot = './node_modules/.vite';
const subsetCaches = fs
    .readdirSync(path.join(cacheRoot, '.subsets'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
// scanFiles 的 default 与 page-1 两套配置各生成一份缓存。
assert.equal(subsetCaches.length, 2, '两套 scanFiles 配置应各生成一份缓存');
for (const entry of subsetCaches) {
    assert.match(
        entry.name,
        /^[0-9a-f]{32}$/,
        `缓存目录名应为配置 hash：${entry.name}`,
    );
    assert.ok(
        fs.existsSync(
            path.join(
                cacheRoot,
                '.subsets',
                entry.name,
                'SmileySans-Oblique_ttf',
                'reporter.bin',
            ),
        ),
        `缺少 reporter.bin：${entry.name}`,
    );
}
assert.ok(
    fs.existsSync(
        path.join(cacheRoot, 'SmileySans-Oblique_ttf', 'reporter.bin'),
    ),
    '缺少最终产物的 reporter.bin',
);
assert.ok(
    fs.existsSync(path.join(cacheRoot, 'SmileySans-Oblique_ttf', 'result.css')),
    '缺少最终产物的 result.css',
);

console.log('vite 测试通过');

// await new Promise((res, rej) => {
//     exec('pnpm rspack build', { cwd: process.cwd() }, (err, stdout, stderr) => {
//         if (err) {
//             rej(err);
//             return;
//         }
//         res(`stdout: ${stdout}`);
//     });
// });

// assert.ok(
//     fs.existsSync(
//         './node_modules/.cache/.font/.subsets/b8339086f76032aa031710e5e3e519db/SmileySans-Oblique_ttf/reporter.json',
//     ),
// );
// assert.ok(
//     fs.existsSync(
//         './node_modules/.cache/.font/.subsets/e107e07a3be215fe5eed7305d4a95ddc/SmileySans-Oblique_ttf/reporter.json',
//     ),
// );
// assert.ok(
//     fs.existsSync(
//         './node_modules/.cache/.font/SmileySans-Oblique_ttf/reporter.json',
//     ),
// );
