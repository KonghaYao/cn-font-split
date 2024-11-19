import { win32, posix } from 'path';

const normalizePathRegExp = new RegExp(`\\${win32.sep}`, 'g');

export function normalizePath(filename: string) {
    return filename.replace(normalizePathRegExp, posix.sep);
}
