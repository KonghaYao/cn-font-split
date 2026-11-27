# 中文字体度量库

使用 fontaine 库测量常用中文字体的字体度量，方便中文网络字体减少 CLS 问题。

要求 Node.js >= 22（见 `package.json` 的 `engines`）。

## 字体来源

苹方 SC https://github.com/refinec/PingFangSC
Noto Serif CJK https://github.com/notofonts/noto-cjk/releases/tag/Serif2.002
Noto Sans CJK https://github.com/notofonts/noto-cjk/releases/tag/Sans2.004

## 度量值不可复现（说明）

`src/metrics.ts` 是**入库的生成结果**（26 条，来自 6 个苹方 SC + 7 个 Noto Serif
CJK SC + 7 个 Noto Sans CJK SC + 6 个微软雅黑 UI 字重）。构建 `cn-font-metrics`
读的是这个文件，不需要重新测量。

无法在干净 clone 上复现的原因：

1. **字体文件不入库**。测量脚本 `fontaine.mjs` 读的是 `packages/metrics/fonts/`，
   该目录被根 `.gitignore` 的 `fonts` 规则忽略，仓库里不存在。
2. **字体来源不可再分发**。苹方 SC 与微软雅黑 UI 是 macOS / Windows 的系统字体
   （PingFang.ttc、msyh.ttc），没有公开下载地址，需要从本机系统字体集自行提取；
   Noto Serif/Sans CJK SC 虽可从上方链接下载完整发行包，但字重文件需要自行挑选。
3. **度量值随字体版本漂移**。`ascent` / `descent` / `xWidthAvg` 由具体字体文件决定，
   Noto CJK 不同 release（Serif 2.002 / Sans 2.004 之后）的度量可能微调，因此即使
   重新下载同名文件也不保证得到与入库文件逐字节相同的数值。

复现步骤（可选，需要自备上述字体）：

```sh
mkdir -p packages/metrics/fonts
# 放入 fontaine.mjs 顶部 EXPECTED_FONTS 列出的 26 个文件
pnpm -C packages/metrics build:font   # 写入 src/metrics.ts 并打印缺失项
```

`fontaine.mjs` 在缺目录时会直接失败并列出期望文件与来源。
