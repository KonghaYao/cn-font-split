import { writeFileSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
export const isMusl = () => {
    let musl: boolean | null = false;
    if (process.platform === 'linux') {
        musl = isMuslFromFilesystem();
        if (musl === null) {
            musl = isMuslFromReport();
        }
        if (musl === null) {
            musl = isMuslFromChildProcess();
        }
    }
    return !!musl;
};

export const isMuslFromFilesystem = () => {
    try {
        return readFileSync('/usr/bin/ldd', 'utf-8').includes('musl');
    } catch {
        return null;
    }
};

export const isMuslFromReport = () => {
    const report: any =
        typeof process.report.getReport === 'function'
            ? process.report.getReport()
            : null;
    if (!report) {
        return null;
    }
    if (report.header && report.header.glibcVersionRuntime) {
        return false;
    }
    if (Array.isArray(report.sharedObjects)) {
        if (
            report.sharedObjects.some(
                (f: string) =>
                    f.includes('libc.musl-') || f.includes('ld-musl-'),
            )
        ) {
            return true;
        }
    }
    return false;
};

export const isMuslFromChildProcess = () => {
    try {
        return execSync('ldd --version', { encoding: 'utf8' }).includes('musl');
    } catch (e) {
        // If we reach this case, we don't know if the system is musl or not, so is better to just fallback to false
        return false;
    }
};

export const saveBinaryToDist = (
    version: string,
    filePath: string,
    binary: ArrayBuffer,
) => {
    writeFileSync(path.resolve(__dirname, '../version'), version);
    return writeFileSync(filePath, new Uint8Array(binary));
};
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);
export const isBinaryExists = (version: string, fileName: string) => {
    const filePath = path.resolve(__dirname, '../' + fileName);
    const versionPath = path.resolve(__dirname, '../version');
    let isExists = false;
    try {
        isExists = readFileSync(versionPath, 'utf-8') === version;
    } catch (e) {}
    return isExists && existsSync(filePath);
};
