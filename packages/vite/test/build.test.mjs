import fs from 'fs-extra';
import { exec } from 'child_process';
import assert from 'assert';
// 执行 pnpm vite build 并检查
fs.emptyDirSync('./node_modules/.vite');
fs.emptyDirSync('./node_modules/.cache');

await new Promise((res, rej) => {
    exec('pnpm vite build -c vite.config.test.mts', { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) {
            rej(err);
            return;
        }
        res(`stdout: ${stdout}`);
    });
});

assert.ok(
    fs.existsSync(
        './node_modules/.vite/.subsets/9e0df19620e2ecada33853c8cb7caf1c/SmileySans-Oblique_ttf/reporter.json',
    ),
);
assert.ok(
    fs.existsSync(
        './node_modules/.vite/.subsets/235d6d3f17828669b8f0141c549d49db/SmileySans-Oblique_ttf/reporter.json',
    ),
);
assert.ok(
    fs.existsSync('./node_modules/.vite/SmileySans-Oblique_ttf/reporter.json'),
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
