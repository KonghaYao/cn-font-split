import fs from 'fs-extra';
import { exec } from 'child_process';
import assert from 'assert';
// 执行 pnpm vite build 并检查
fs.emptyDirSync('./node_modules/.vite');
fs.emptyDirSync('./node_modules/.cache');

await new Promise((res, rej) => {
    exec('pnpm vite build', { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) {
            rej(err);
            return;
        }
        res(`stdout: ${stdout}`);
    });
});

assert.ok(
    fs.existsSync(
        './node_modules/.vite/.subsets/2f32afea01e31e457a7be1dabf93e228/SmileySans-Oblique_ttf/reporter.json',
    ),
);
assert.ok(
    fs.existsSync(
        './node_modules/.vite/.subsets/1851a5900af7816b43bd1b9aefd9da9f/SmileySans-Oblique_ttf/reporter.json',
    ),
);
assert.ok(
    fs.existsSync('./node_modules/.vite/SmileySans-Oblique_ttf/reporter.json'),
);

await new Promise((res, rej) => {
    exec('pnpm rspack build', { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) {
            rej(err);
            return;
        }
        res(`stdout: ${stdout}`);
    });
});

assert.ok(
    fs.existsSync(
        './node_modules/.cache/.font/.subsets/2f32afea01e31e457a7be1dabf93e228/SmileySans-Oblique_ttf/reporter.json',
    ),
);
assert.ok(
    fs.existsSync(
        './node_modules/.cache/.font/.subsets/1851a5900af7816b43bd1b9aefd9da9f/SmileySans-Oblique_ttf/reporter.json',
    ),
);
assert.ok(
    fs.existsSync(
        './node_modules/.cache/.font/SmileySans-Oblique_ttf/reporter.json',
    ),
);
