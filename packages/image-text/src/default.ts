import fse from "fs-extra";

export const defaultLog = (...args: any[]) => {
    console.log(...args);
};
export const defaultOutputFile = (
    file: string,
    data: any,
    options?: string | fse.WriteFileOptions | undefined
) => {
    return fse.outputFile(file, data, options);
};
