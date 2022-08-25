# 中文 Web Font 切割工具

| 更新时间： 2022/ 4 / 4 | 江夏尧 |

## 简介

在工作中遇到了使用中文字体的烦恼，字体包动不动就 10 多 MB，没有办法在 Web 应用中使用，所以制作了这个字体切割的插件。通过插件将大的字体文件切割为多个小的字体文件，然后通过 CSS 文件的 `unicode-range` 按需加载，实现整个字符集的可用加载！

### 字符单个大小

不同于服务器加载 HTML 时抽取需要字符然后返回字符文件的操作，浏览器依据 CSS 中的 `unicode-range` 按需加载需要的字体文件，**每个文件只有 150 - 300 KB**，非常的快速简洁。

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
        fontFamily: "SourceHanSerifCN", // 新版本必须指定
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

测试文件为 站酷庆科黄油体 字体文件

```txt
准备字符集：0.435ms
准备 woff2: 35.844ms
读取字体：6.49ms
SC | 总数：6763 | 分包数目：6
1128 1128 1128 1128 1128 1123
TC | 总数：2328 | 分包数目：3
776 776 776
other | 总数：883 | 分包数目：1
883
校对和切割目标字体：6.457ms
总分包数目： 10
  已经开始分包了，请耐心等待。
分包情况：3 | 分字符集大小 | 1128: 5.79ms
分包情况：2 | 分字符集大小 | 1128: 4.991ms
分包情况：1 | 分字符集大小 | 1128: 6.211ms
分包情况：0 | 分字符集大小 | 883: 7.139ms
分包情况：4 | 分字符集大小 | 1128: 7.793ms
分包情况：5 | 分字符集大小 | 1128: 5.932ms
分包情况：6 | 分字符集大小 | 1123: 7.205ms
分包情况：7 | 分字符集大小 | 776: 6.956ms
分包情况：8 | 分字符集大小 | 776: 7.412ms
分包情况：9 | 分字符集大小 | 776: 7.75ms
生成文件：0 qDDyc5qdwE1Z9wTjDr0Jt 23.23 KB
生成文件：1 zPP-f05Z9fHHJ3YQiqwvM 155.53 KB
生成文件：2 NepY84eyK4gDD8TPvW78- 191.58 KB
生成文件：3 uBRZ3cb0wfYJZpzXZlmxG 206.52 KB
生成文件：4 06FpWBo2suDp7MpcGJATQ 212.96 KB
生成文件：7 HlGMPrQiT5gJoBrvLeCEH 134.99 KB
生成文件：5 OX85gy-FUkMdgM5LMz2i3 216.75 KB
生成文件：8 9sOrrDugkP2QhFWxci4FR 144.93 KB
生成文件：6 6gGZ9FsKPb4FlkP6giQRV 217.5 KB
生成文件：9 YpcAtyveFqEwY2yMrIqCT 152.38 KB
切割总耗时：10.476s
切割分包：10.496s
生成 CSS 文件：8.102ms
生成 Template.html 文件：3.656ms
```

> 可以看到上面的分包结果均在 200-400 KB，属于比较合适的区间内。并且运行时间最长的部分只需要 11s。

## 以后要做的加强

-   [ ] 兼容任意的输入字体格式
-   [ ] 输入任意格式的字体

## 已经知道的 BUG

1. otf 读取失败，这个是 fonteditor-core 的 bug

## 开源许可证

2.0.5 及以后 Apache-2.0

2.0.4 版本以前 MIT License
