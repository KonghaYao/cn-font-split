# 中文 Web Font 切割工具

| 更新时间： 2022/ 8 / 26 | 江夏尧 | Version 3.0.0 |

## 简介

在工作中遇到了使用中文字体的烦恼，字体包动不动就 10 多 MB，没有办法在 Web 应用中使用，所以制作了这个字体切割的插件。通过插件将大的字体文件切割为多个小的字体文件，然后通过 CSS 文件的 `unicode-range` 按需加载，实现整个字符集的可用加载！

### 字符单个大小

不同于服务器加载 HTML 时抽取需要字符然后返回字符文件的操作，浏览器依据 CSS 中的 `unicode-range` 按需加载需要的字体文件，**每个文件只有 150 - 300 KB**，非常的快速简洁。

### 使用率的考量

我在考虑字符集的切割的时候，考虑了字符集中的字符的使用率不均匀的问题。

**字符集按照使用频率的高低进行分配位置。**

比如靠前的第一个字符分集中，都是使用率极高的字符，加载的可能性也更高，使用起来请求的时候方便缓存下来。

### 成品预览

成品可以查看我的字体库网站：

[字体库](https://chinese-font.netlify.app/#/home)

里面的字体都是可以免费商用的，我对其进行了切割并且放置在了 [Github](https://github.com/KonghaYao/chinese-free-web-font-storage) 和 [Gitee](https://gitee.com/dongzhongzhidong/chinese-free-web-font-storage) 上，如果需要可以直接获取文件。

## 快速使用

Nodejs 版本需要支持 es module，如果版本不够的话运行不了。

```bash
npm install @konghayao/cn-font-split
```

配置程序

```js
import { fontSplit } from "@konghayao/cn-font-split";

fontSplit({
    FontPath: "./fonts/SourceHanSerifCN-Bold.ttf",
    destFold: "./build",
    css: {
        // fontFamily: "站酷庆科黄油体", // 不建议使用，我们已经有内置的解析模块了
        // fontWeight: 400,
    },
    targetType: "ttf", // ttf woff woff2；注意 eot 文件在浏览器中的支持度非常低，所以不进行支持
    // chunkSize: 200 * 1024, // 如果需要的话，自己定制吧
});
```

## 已经知道的 BUG

1. 部分 otf 读取失败，这个可能是 otf 文件的问题
2. eot 文件在浏览器中的支持度非常低，所以没有必要使用这种字体格式作为目标格式

## TODO

1. GB 2312 范围字体囊括检测
2. 重复字形问题

## 开源许可证

2.0.5 及以后 Apache-2.0

2.0.4 版本以前 MIT License
