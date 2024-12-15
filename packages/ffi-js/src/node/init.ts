import { isBinaryExists, isMusl, saveBinaryToDist } from './isMusl.js';
import {
    getBinaryFile,
    getBinName,
    getLatestVersion,
    matchPlatform,
} from '../load.js';
import { fileURLToPath } from 'url';
import path from 'path';

// @ts-ignore 获取当前模块的 URL
const __filename = fileURLToPath(import.meta.url);

// 获取当前模块所在的目录
const __dirname = path.dirname(__filename);
async function main() {
    const version = await getLatestVersion();
    let platform = process.env.CN_FONT_SPLIT_PLATFORM;
    if (!platform)
        platform = matchPlatform(process.platform, process.arch, isMusl);
    console.log(
        `cn-font-split ${version} ${platform} library downloading -> ${platform}`,
    );
    const fileName = getBinName(platform);
    if (isBinaryExists(version, fileName))
        return console.log(
            `cn-font-split ${version} ${platform} library -> already exists`,
        );
    const binary = await getBinaryFile(
        platform,
        version,
        process.env.CN_FONT_SPLIT_GH_HOST,
    );
    const ffiPath = path.resolve(__dirname, '../' + fileName);
    console.table({ version, platform, fileName, __dirname });
    return saveBinaryToDist(version, ffiPath, binary);
}
main();
