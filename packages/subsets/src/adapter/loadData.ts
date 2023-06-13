/** 通过文件系统获取文件的方法，需要进行适配才能在特定的平台使用 */
export const loadData = async (tag: string) => {
    const fs = await import("fs/promises");
    return fs.readFile(tag);
};
