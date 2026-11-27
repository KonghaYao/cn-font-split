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

const cacheRoot = './node_modules/.vite';
/** 全量模式的缓存目录名：<字体文件名>-<产物配置哈希> */
const fullCachePrefix = 'SmileySans-Oblique_ttf-';

// 执行 pnpm vite build 并检查
function runBuild(extraEnv = {}) {
    return new Promise((res, rej) => {
        exec(
            'pnpm vite build -c vite.config.test.mts',
            { cwd: process.cwd(), env: { ...env, ...extraEnv } },
            (err, stdout, stderr) => {
                if (err) {
                    rej(new Error(`${err.message}\n${stdout}\n${stderr}`));
                    return;
                }
                res(stdout);
            },
        );
    });
}

function listFullCacheDirs() {
    if (!fs.existsSync(cacheRoot)) return [];
    return fs
        .readdirSync(cacheRoot, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isDirectory() && entry.name.startsWith(fullCachePrefix),
        )
        .map((entry) => entry.name)
        .sort();
}

function readResultCss(dirName) {
    return fs.readFileSync(path.join(cacheRoot, dirName, 'result.css'), 'utf8');
}

/** 用一个只改 css.fontDisplay 的配置再构建一次，返回这次新增的全量缓存目录 */
async function buildWithFontDisplay(fontDisplay, knownDirs) {
    await runBuild({ FONT_DISPLAY: fontDisplay });
    const added = listFullCacheDirs().filter(
        (name) => !knownDirs.includes(name),
    );
    assert.equal(
        added.length,
        1,
        `css.fontDisplay=${fontDisplay} 应新建一份全量缓存目录，实际新增 ${added.length} 份`,
    );
    return added[0];
}

fs.emptyDirSync('./node_modules/.vite');
fs.emptyDirSync('./node_modules/.cache');

// 构建 1：默认配置（不设置 css，Rust 侧 font-display 默认 swap）
await runBuild();

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

const defaultFullDirs = listFullCacheDirs();
assert.equal(
    defaultFullDirs.length,
    1,
    `全量缓存目录应只有一份：${defaultFullDirs.join(', ')}`,
);
const defaultFullDir = defaultFullDirs[0];
assert.match(
    defaultFullDir,
    new RegExp(`^${fullCachePrefix}[0-9a-f]{32}$`),
    `全量缓存目录名应为 <字体文件名>-<配置 hash>：${defaultFullDir}`,
);
assert.ok(
    fs.existsSync(path.join(cacheRoot, defaultFullDir, 'reporter.bin')),
    '缺少最终产物的 reporter.bin',
);
assert.ok(
    fs.existsSync(path.join(cacheRoot, defaultFullDir, 'result.css')),
    '缺少最终产物的 result.css',
);
assert.match(
    readResultCss(defaultFullDir),
    /font-display:swap/,
    '未配置 css.fontDisplay 时应使用默认值 swap',
);

// issue #217：只改 css.fontDisplay、不删缓存，也必须重新生成 result.css
const optionalDir = await buildWithFontDisplay('optional', defaultFullDirs);
assert.match(
    readResultCss(optionalDir),
    /font-display:optional/,
    'fontDisplay: optional 应生成 font-display:optional',
);

// 第二次只改回 swap：不删缓存，必须命中新的缓存键而不是 optional 的旧产物
const swapDir = await buildWithFontDisplay('swap', [
    ...defaultFullDirs,
    optionalDir,
]);
assert.notEqual(swapDir, optionalDir, 'fontDisplay 变化后缓存目录必须变化');
assert.match(
    readResultCss(swapDir),
    /font-display:swap/,
    '改回 fontDisplay: swap 后应重新生成 result.css',
);
// optional 那一份保持原样，说明没有被原地覆盖
assert.match(
    readResultCss(optionalDir),
    /font-display:optional/,
    'optional 的旧产物应保持原样',
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
