'use strict';

var Transaction = require('@konghayao/promise-transaction');
var fse = require('fs-extra');
var path = require('path');
var codePoints = require('code-points');
var nanoid = require('nanoid');
var fonteditorCore = require('fonteditor-core');
var lodashEs = require('lodash-es');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var Transaction__default = /*#__PURE__*/_interopDefaultLegacy(Transaction);
var fse__default = /*#__PURE__*/_interopDefaultLegacy(fse);
var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var codePoints__default = /*#__PURE__*/_interopDefaultLegacy(codePoints);

module.exports = __dirname;

function getUnicodeRangeArray(str) {
    return codePoints__default['default'](str, {
        unique: true,
    });
}

// {
//     common: true, //简繁共有部分
//     SC: true, // 简体
//     other: true, // 非中文及一些符号
//     TC: true, // 繁体
//     ...charset,
// }
function loadTC() {
    let TC = fse__default['default']
        .readFileSync("./charset/TCDiff.txt", {
            encoding: "utf-8",
        })
        .split("")
        .filter((_, i) => !(i % 2))
        .join("");
    return TC;
}
function prepareCharset(config) {
    let charset = {
        SC: [],
        TC: [],
        other: [],
    };
    // 只要是 简体或者使用了 common 就先导入基本的文件
    if (config.SC) {
        charset.SC = fse__default['default'].readFileSync("./charset/SC.txt", {
            encoding: "utf-8",
        });
    }

    if (config.TC) {
        charset.TC = loadTC();
    }

    if (config.other) {
        charset.other = fse__default['default'].readFileSync("./charset/symbol.txt", {
            encoding: "utf-8",
        });
    }

    return {
        SC: getUnicodeRangeArray(charset.SC),
        TC: getUnicodeRangeArray(charset.TC),
        other: getUnicodeRangeArray(charset.other),
    };
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function ReadFontDetail(file) {
    const font = fonteditorCore.Font.create(file, {
        type: "ttf",
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    const fontObj = font.get();

    return fontObj.name;
}
function ReadFontUnicode(file) {
    const font = fonteditorCore.Font.create(file, {
        type: "ttf",
        subset: [],
        hinting: true,
        compound2simple: true,
    });
    const fontObj = font.get();
    const result = Object.keys(fontObj.cmap);
    console.log(" - 总共找到 " + result.length + " 个字符");
    return result;
}
// 裁切一个 woff2 文件出来
// file: Buffer
// subset: unicode Number Array
// chunkSize: How many fonts every chunk contain
async function CutFont(file, subset) {
    const font = fonteditorCore.Font.create(file, {
        type: "ttf",
        subset,
        hinting: true,
        compound2simple: true,
    });
    font.optimize();
    const fontObject = font.get();
    const subFontSize = fontObject.glyf
        .map((i) => i.unicode)
        .flat()
        .filter((i) => typeof i === "number").length;

    console.log(subFontSize);
    await fonteditorCore.woff2.init();
    return font.write({
        type: "woff2",
        hinting: true,
    });
}

// 分包系统
async function CutTargetFont (
    { file, size, name },
    { other, TC, SC },
    chunkOptions = {}
) {
    console.log(name, formatBytes(size));

    const allCode = await ReadFontUnicode(file);

    const total = { other, TC, SC };
    const last = Object.entries(total).reduce((col, [key, value]) => {
        if (value.length) {
            const subset = lodashEs.intersection(allCode, value);
            const size = Math.ceil(subset.length / chunkOptions[key]);
            const result = lodashEs.chunk(subset, size);
            col.set(key, result);
            console.log(key, "分包数目: ", value.length);
        }
        return col;
    }, new Map());
    return Object.fromEntries(last.entries());
}

async function index ({
    FontPath,
    destFold = "./build",
    css: {
        fontFamily = "",
        fontWeight = "",
        fontStyle = "",
        fontDisplay = "",
    } = {},
    cssFileName = "result", // 生成 CSS 文件的名称
    chunkOptions = {}, //
    charset = {},
}) {
    charset = {
        SC: true, // 简体
        other: true, // 非中文及一些符号
        TC: false, // 繁体
        ...charset,
    };
    chunkOptions = {
        TC: 10,
        SC: 10,
        other: 2,
        ...chunkOptions,
    };
    const tra = new Transaction__default['default'](
        [
            ["准备字符集", () => prepareCharset(charset)],
            [
                "读取字体",
                async () => {
                    let stat = fse__default['default'].statSync(FontPath);
                    const file = await fse__default['default'].readFile(FontPath);
                    const detail = ReadFontDetail(FontPath);
                    return { ...detail, ...stat, file };
                },
            ],
            [
                "校对和切割目标字体",
                async (charMap, result) => {
                    return await CutTargetFont(
                        charMap.get("读取字体"),
                        result,
                        chunkOptions
                    );
                },
            ],
            [
                "开始切割分包",
                async (charMap, { other = [], SC = [], TC = [] }) => {
                    const { file } = charMap.get("读取字体");
                    const promises = [...other, ...SC, ...TC].map(
                        (subsetArray) =>
                            Promise.all(
                                subsetArray.map(async (subset) => {
                                    const font = CutFont(file, subset);
                                    return { font, subset };
                                })
                            )
                    );
                    return Promise.all(promises);
                },
            ],
            [
                "输出 woff2 文件",
                async (charMap, last) => {
                    const fileArray = last.flat();
                    let [promises, IDCollection] = fileArray.reduce(
                        (col, { font, subset }) => {
                            const id = nanoid.nanoid();
                            const Path = path__default['default'].join(destFold, id + ".woff2");
                            console.log("生成文件:", id, font.length);
                            const promise = outputFile(Path, font);
                            col[0].push(promise);
                            col[1].push({ id, subset });
                            return col;
                        },
                        [[], []]
                    );
                    return Promise.all(promises).then(() => IDCollection);
                },
            ],
            [
                "生成 CSS 文件",
                async (charMap, IDCollection) => {
                    const { fontFamily: ff } = charMap.get("读取字体");
                    const cssStyleSheet = IDCollection.map(({ id, subset }) => {
                        return `@font-face {
    font-family: ${fontFamily || ff};
    src: url("./${id}.woff2") format("woff2");
    font-style: ${fontStyle};
    font-weight: ${fontWeight};
    font-display: ${fontDisplay};
    unicode-range:${subset.map((i) => `U+${i.toString(16)}`).join(",")}
}`;
                    }).join("\n");
                    return outputFile(
                        path__default['default'].join(
                            destFold,
                            (cssFileName || "result") + ".woff2"
                        ),
                        cssStyleSheet
                    );
                },
            ],
            ["生成 Template.html 文件", () => {}],
            ["汇报数据大小", () => {}],
        ]
            .map((i) => {
                return [
                    ["start" + i[0], () => console.time(i[0])],
                    i,
                    ["end" + i[0], () => console.timeEnd(i[0])],
                ];
            })
            .flat()
    );
    return tra.run();
}

module.exports = index;
