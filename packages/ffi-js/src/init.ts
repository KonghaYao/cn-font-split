import { execFile, spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);

export function runInitScript() {
    const isWindows = process.platform === 'win32';

    // 获取除程序名和当前脚本外的所有命令行参数
    const args = process.argv.slice(2);

    if (isWindows) {
        // Windows平台下运行Powershell脚本
        const scriptPath = path.resolve(__dirname, './init.ps1');
        const powershellArgs = [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath,
            ...args,
        ];
        return new Promise((resolve, reject) => {
            execFile(
                'powershell.exe',
                powershellArgs,
                (error, stdout, stderr) => {
                    if (error) {
                        console.error(
                            `Error executing PowerShell script: ${error.message}`,
                        );
                        reject(error);
                        return;
                    }
                    resolve(null);
                    console.log(`PowerShell script output: ${stdout}`);
                },
            );
        });
    } else {
        // 非Windows平台（如Linux或macOS）下运行shell脚本
        const scriptPath = path.resolve(__dirname, './init.sh');
        const child = spawn('bash', [scriptPath, ...args], {
            stdio: 'inherit',
        });
        return new Promise((resolve, reject) => {
            child
                .on('close', (code) => {
                    if (code !== 0) {
                        reject();
                        console.error(`Shell script exited with code ${code}`);
                    } else {
                        resolve(null);
                        console.log('Shell script executed successfully.');
                    }
                })
                .on('error', (err) => {
                    reject(err);
                    console.error('Failed to start shell script:', err);
                });
        });
    }
}
