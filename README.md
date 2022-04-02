# 中文 Web Font 切割工具

## 简介

在工作中遇到了使用中文字体的烦恼，字体包动不动就 10 多 MB，没有办法在 Web 应用中使用，所以制作了这个字体切割的插件。通过插件将大的字体文件切割为多个小的字体文件，然后通过 CSS 文件的 `unicode-range` 按需加载，实现整个字符集的可用加载！

### 字符单个大小

不同于服务器加载 HTML 时抽取需要字符然后返回字符文件的操作，浏览器依据 CSS 中的 `unicode-range` 按需加载需要的字体文件，**每个文件只有 150 - 400 KB**，非常的快速简洁。

### 使用率的考量

我在考虑字符集的切割的时候，考虑了字符集中的字符的使用率不均匀的问题。

**字符集按照使用频率的高低进行分配位置。**

比如靠前的第一个字符分集中，都是使用率极高的字符，加载的可能性也更高，使用起来请求的时候方便缓存下来。

### 字体最终大小方面

    SourceHanSerifCN-Bold---| **12.24 MB**

    结果文件总大小-----------| **2.74 MB**

    压缩率--------------------|**22.38 %**

### 成品预览

成品可以查看我的字体库网站：

[Github 字体库](https://konghayao.github.io/chinese-free-web-font-storage/)

[Gitee 字体库](http://dongzhongzhidong.gitee.io/chinese-free-web-font-storage)

里面的字体都是可以免费商用的，我对其进行了切割并且放置在了 [Github](https://github.com/KonghaYao/chinese-free-web-font-storage) 和 [Gitee](https://gitee.com/dongzhongzhidong/chinese-free-web-font-storage) 上，如果需要可以直接获取文件。

## 快速使用

Nodejs 版本需要支持 es module，如果版本不够的话运行不了。

```bash
npm install @konghayao/cn-font-split
```

配置程序

```js
import fontSplit from "@konghayao/cn-font-split";
fontSplit({
    // 您的字体文件，现阶段只使用的 ttf 相关的插件
    FontPath: "./fonts/SourceHanSerifCN-Bold.ttf",

    // 存放字体文件的文件夹
    destFold: "./build",
    css: {
        // 生成 CSS 文件的配置
        fontStyle: "normal",
        fontWeight: "normal",
        fontDisplay: "swap",
        fontFamily: "", // 如果不设置的话将会使用默认的字体名称哦
    },
    charset: {
        // 字符集
        other: true, // 保留其他字符（包括数字，符号，英文，日文等）
        TC: true, // 保留繁体中文
        SC: true, // 保留简体中文
    },
    chunkOptions: {
        // 这个配置还是很常用的，程序本身会汇报切割字体的大小
        // 100-400kb 一个文件是正常的。如果过大可以调节下面的分包选项
        other: 1, // 切割其他字符到 1 个字体文件中
        SC: 4, // 切割其他字符到 4 个字体文件中
        TC: 1, // 切割其他字符到 1 个字体文件中
    },
});
```

### 运行 js 文件

命令行执行结果：

```txt
准备字符集：8.89ms
zcoolqingkehuangyouti 9.29 MB
读取字体：4.505s
other | 总数：883 | 分包数目：1
883
TC | 总数：2328 | 分包数目：3
776 776 776
SC | 总数：6763 | 分包数目：6
1128 1128 1128 1128 1128 1123
校对和切割目标字体：1.996ms
总分包数目： 10
  已经开始分包了，请耐心等待。
分包情况：0 | 分字符集大小 | 883: 2.844s
    生成文件：LLnd8IAqFHEaqI9WATp1D 37.04 KB
分包情况：7 | 分字符集大小 | 776: 8.584s
    生成文件：Z0HJyZk6FM0vSFSxUKqhS 237.77 KB
分包情况：1 | 分字符集大小 | 1128: 8.899s
    生成文件：CZSaHxohYuQ5nuHPX2iJN 247.55 KB
分包情况：8 | 分字符集大小 | 776: 9.201s
    生成文件：M-0Go3MOhMllGlqbkllkK 262.91 KB
分包情况：9 | 分字符集大小 | 776: 9.548s
    生成文件：jZtejKYDbBR04AY1yy2Gt 276.25 KB
分包情况：2 | 分字符集大小 | 1128: 9.853s
    生成文件：5KHYdAJxVMTVrJLtt9ZPJ 305.65 KB
分包情况：3 | 分字符集大小 | 1128: 10.130s
    生成文件：TplO3e5igIVVj8QPrZWk5 330.84 KB
分包情况：4 | 分字符集大小 | 1128: 10.468s
    生成文件：bSK4BPtiiM9nZOWy5ofmw 340.88 KB
分包情况：5 | 分字符集大小 | 1128: 10.521s
    生成文件：V6cSjHfj-WtEkqbkVAkQR 347.13 KB
分包情况：6 | 分字符集大小 | 1123: 10.553s
    生成文件：eQEPT8ta71TGmkg2ocbdP 351.15 KB
开始切割分包：11.209s
生成 CSS 文件：5.174ms
生成 Template.html 文件：5.291ms

```

> 可以看到上面的分包结果均在 200-400 KB，属于比较合适的区间内。并且运行时间最长的部分只需要 11s。

## 开源许可证

2.0.5 及以后 Apache-2.0

2.0.4 版本以前 MIT License

## 感谢相关插件

-   **@konghayao/promise-transaction** 基础任务管理插件，是整个程序的执行顺序框架。
-   **fonteditor-core** 字体解析切割和制作的核心插件
-   **nanoid** 生成独一无二的文件名的库
-   **threads** Nodejs 多线程支持，强！字体的生成速度加快了非常多
-   **code-points** 解析文字为 Unicode 数字的插件
-   **fs-extra** Nodejs fs 的升级版
-   **lodash-es** 强无敌的工具库

## 以后要做的加强

-   [ ] 兼容任意的输入字体格式
-   [ ] 输入任意格式的字体

## 已经知道的 BUG

1. otf 读取失败，这个是 fonteditor-core 的 bug
