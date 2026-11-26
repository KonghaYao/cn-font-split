import fs from 'node:fs';
import path from 'node:path';

// 该脚本在 preinstall 阶段运行，此时依赖尚未安装完成，因此只用 Node 内置模块。
const chunksDir = './node_modules/vite/dist/node/chunks';

// pnpm 的 preinstall 早于依赖链接：全新 clone 上 vite 还不存在，此时直接跳过。
// 已安装过依赖（或在安装后手动执行 `pnpm fix_dep`）时才会真正打补丁。
if (!fs.existsSync(chunksDir)) {
    console.log('跳过 vite 修复：vite 尚未安装（全新安装会在依赖安装前执行本脚本）');
    process.exit(0);
}

const items = fs
    .readdirSync(chunksDir)
    .map((i) => path.join(chunksDir, i));

for (const file of items) {
    let code = fs.readFileSync(file, 'utf-8');
    const isNeedChange = /shouldInline/.test(code);
    code = code.replace(/(\(config.build.lib\)[\n\s]+return )true/, '$1false');
    // console.log(isNeedChange);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, code);
}
console.log('vite 修复成功')

// 改动点
// const shouldInline = (config, file, id, content, pluginContext, forceInline) => {
//     if (config.build.lib)
//         return true; // 这个需要改为 false
