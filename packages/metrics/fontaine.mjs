// 从 ./fonts/ 下的字体文件重新生成 src/metrics.ts。
//
// 注意：仓库**不包含** fonts/ 目录（.gitignore 里的 `fonts` 规则），因此这个脚本
// 在干净 clone 上必然无法运行；src/metrics.ts 是入库的生成结果，日常构建读的是
// 它，不需要本脚本。这里保留脚本只是为了说明度量值的来源与重算方式。
//
// 用法：
//   mkdir -p packages/metrics/fonts && 放入下列字体
//   pnpm -C packages/metrics build:font
import fs from 'node:fs';
import { readMetrics } from 'fontaine';
import { glob } from 'glob';
import { pathToFileURL } from 'url';

/** 生成 src/metrics.ts 所需的字体文件（文件名去掉扩展名即导出变量名）。 */
const EXPECTED_FONTS = [
    // 苹方 SC —— macOS 系统字体 PingFang.ttc 拆分出的字重，非公开发行
    'PingFangSC-Ultralight.ttf',
    'PingFangSC-Thin.ttf',
    'PingFangSC-Light.ttf',
    'PingFangSC-Regular.ttf',
    'PingFangSC-Medium.ttf',
    'PingFangSC-Semibold.ttf',
    // Noto Serif CJK SC —— https://github.com/notofonts/noto-cjk/releases/tag/Serif2.002
    'NotoSerifCJKsc-ExtraLight.otf',
    'NotoSerifCJKsc-Light.otf',
    'NotoSerifCJKsc-Regular.otf',
    'NotoSerifCJKsc-Medium.otf',
    'NotoSerifCJKsc-SemiBold.otf',
    'NotoSerifCJKsc-Bold.otf',
    'NotoSerifCJKsc-Black.otf',
    // Noto Sans CJK SC —— https://github.com/notofonts/noto-cjk/releases/tag/Sans2.004
    'NotoSansCJKsc-Thin.otf',
    'NotoSansCJKsc-Light.otf',
    'NotoSansCJKsc-DemiLight.otf',
    'NotoSansCJKsc-Regular.otf',
    'NotoSansCJKsc-Medium.otf',
    'NotoSansCJKsc-Bold.otf',
    'NotoSansCJKsc-Black.otf',
    // 微软雅黑 UI —— Windows 系统字体（msyh.ttc），非公开发行
    'MicrosoftYaHeiUILight.ttf',
    'MicrosoftYaHeiUI.ttf',
    'MicrosoftYaHeiUIBold.ttf',
    'MicrosoftYaHeiLight.ttf',
    'MicrosoftYaHei.ttf',
    'MicrosoftYaHeiBold.ttf',
];

const FONT_DIR = './fonts';

if (!fs.existsSync(FONT_DIR)) {
    console.error(
        `找不到字体目录 ${FONT_DIR}/（仓库不包含该目录）。\n\n` +
            `src/metrics.ts 已入库，正常构建不需要本脚本；只有需要重新测量时才执行：\n` +
            `  mkdir -p packages/metrics/fonts\n` +
            `  放入以下 ${EXPECTED_FONTS.length} 个字体后重跑 \`pnpm -C packages/metrics build:font\`：\n` +
            EXPECTED_FONTS.map((name) => `    ${name}`).join('\n') +
            `\n\n来源：PingFang SC（macOS）、Microsoft YaHei UI（Windows）为系统字体，` +
            `需自行从系统字体集提取；Noto Serif/Sans CJK SC 见 packages/metrics/README.md 的下载链接。`,
    );
    process.exit(1);
}

const fonts = glob.globSync(`${FONT_DIR}/**/*.{otf,ttf}`, { absolute: true });

if (fonts.length === 0) {
    console.error(
        `${FONT_DIR}/ 下没有任何 .otf/.ttf 字体。\n` +
            `期望至少包含（共 ${EXPECTED_FONTS.length} 个）：\n` +
            EXPECTED_FONTS.map((name) => `    ${name}`).join('\n') +
            `\n来源见 packages/metrics/README.md。`,
    );
    process.exit(1);
}

let code = '';

const codeTemplate = (key, metrics) => `
export const ${key.replace('-', '')} = ${JSON.stringify(metrics)};`;

for (const font of fonts) {
    const metrics = await readMetrics(pathToFileURL(font));

    code += codeTemplate(font.split('/').pop().split('.')[0], metrics);
}

fs.writeFileSync('./src/metrics.ts', code);

const produced = fonts.map((font) => font.split('/').pop().split('.')[0]);
const missing = EXPECTED_FONTS.map((name) => name.split('.')[0]).filter(
    (name) => !produced.includes(name),
);
if (missing.length > 0) {
    console.warn(
        `[warn] 以下 ${missing.length} 个字体缺失，src/metrics.ts 将缺少对应导出：\n` +
            missing.map((name) => `    ${name}`).join('\n'),
    );
}
console.log(`wrote src/metrics.ts from ${fonts.length} font(s)`);
