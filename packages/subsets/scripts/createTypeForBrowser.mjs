import fse from "fs-extra";
export const createTypeForBrowser = () => {
    fse.outputFile("./dist/browser/index.d.ts", `export * from '../index'`);
};
