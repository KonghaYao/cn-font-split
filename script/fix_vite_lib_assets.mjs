import fs from 'fs-extra';

const items = fs
    .readdirSync('./node_modules/vite/dist/node/chunks')
    .map((i) => './node_modules/vite/dist/node/chunks/' + i);

for (const file of items) {
    let code = fs.readFileSync(file, 'utf-8');
    const isNeedChange = /shouldInline/.test(code);
    code = code.replace(/(\(config.build.lib\)\n\s+return )true/, '$1false');
    // console.log(isNeedChange);
    fs.outputFileSync(file, code);
}
console.log('vite 修复成功')

// 改动点
// const shouldInline = (config, file, id, content, pluginContext, forceInline) => {
//     if (config.build.lib)
//         return true; // 这个需要改为 false
