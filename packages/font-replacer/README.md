![中文网字计划](/assets/chinese-fonts.png)

# cn-font-replacer

font-replacer 是 [中文网字计划](https://chinese-font.netlify.app/) 用于动态加载、动态更换字体所使用的库。你也可以自定义字体源来加载自己的字体，默认使用了 [字图 CDN](https://chinese-font.netlify.app/cdn/) 的庞大字体库来源！

## 功能

-   动态字体替换：根据提供的映射关系动态地在 HTML 中替换字体, 简单好用。
-   灵活的集成方式：Vue、React、Svelte、Angular、jQuery、纯 JS 都可以轻松使用。
-   自动加载字体、自动应用字体：不用担心其他的，直接用 JS 调用函数，剩下的插件会解决。

## 安装

`npm install cn-font-replacer`

## 用法

```js
import { FontReplacer, getChineseFontsMap } from 'cn-font-replacer';
// 获取中文网字计划的 字图 CDN 的相应数据
const CNFontMap = await getChineseFontsMap();

console.log(CDFontMap);

// 注入到 FontReplacer 实例
const fontReplacer = new FontReplacer(CNFontMap);

fontReplacer.applyFont(
    document.body,
    '得意黑.SmileySans-Oblique' /* 这个字符串是 CNFontMap 的 key */,
);

// 稍等片刻，字体就会加载上去了
```

## 证书

MIT
