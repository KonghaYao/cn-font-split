import { isMusl, saveBinaryToDist } from './isMusl.js';
import { getBinaryFile, getLatestVersion, matchPlatform } from '../load.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// @ts-ignore 获取当前模块的 URL 
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = dirname(__filename);
async function main() {
    const version = await getLatestVersion();
    const platform = matchPlatform(process.platform, process.arch, isMusl);
    const { binary, fileName } = await getBinaryFile(platform, version);
    console.table({ version, platform, fileName, __dirname });
    return saveBinaryToDist(__dirname + '/' + fileName, binary);
}
main();
