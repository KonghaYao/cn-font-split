import fs from 'fs-extra';
import { exec } from 'child_process';
import path from 'path'
// 执行 pnpm vite build 并检查


fs.emptyDirSync('./node_modules/.vite')



// 在当前目录下的scripts文件夹里执行hexo g命令
await new Promise((res, rej) => {
  exec('pnpm vite build', { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) {
            rej(err);
            return;
        }
        res(`stdout: ${stdout}`);
    });
})

fs.existsSync('./node_modules/.vite/SmileySans-Oblique_ttf/reporter.json')
fs.existsSync('./node_modules/.vite/550f6d0bdaac0c337c8be0d99865edcb/reporter.json')