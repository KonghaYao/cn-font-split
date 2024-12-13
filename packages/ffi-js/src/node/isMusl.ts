import { writeFileSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
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

export const saveBinaryToDist = (filePath: string, binary: ArrayBuffer) => {
    return writeFileSync(filePath, new Uint8Array(binary));
};

