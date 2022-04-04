import chalk from "chalk";

export function _formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
/** 计算数据大小 */
export function formatBytes(bytes: number, decimals = 2) {
    /** <<10 为 kb  */
    const text = _formatBytes(bytes, decimals);
    if (bytes < 0xff << 10) {
        return chalk.green(text);
    } else if (bytes < 360 << 10) {
        return chalk.yellow(text);
    } else {
        return chalk.red(text);
    }
}
