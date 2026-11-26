# packages/test — 测试台

本目录有两个用途完全不同的测试入口：

| 入口 | 命令 | 在 CI 里？ | 依赖 |
| --- | --- | --- | --- |
| **视觉回归**（`visual/`） | `node packages/test/visual/run.mjs` | ✅ `ci.yml` 的 `visual-macos`（像素比对）与 `visual-linux-smoke`（Chromium 冒烟） | 本地字体 + 自建 FFI + Playwright |
| **e2e**（`e2e/*.spec.ts`） | `pnpm -C packages/test test` | ❌ 不在 CI，仅本地手动 | 先手动起 `pnpm -C packages/test dev`（`http://localhost:5173`）+ `packages/test/script/build.mjs` 产物 |

## 视觉回归（唯一 CI 门禁）

runner 直接用仓库内 `packages/demo/public/` 的本地字体跑 `cn-font-split`，
把产物交给 Playwright 渲染后与 `visual/baseline/` 的基线逐像素比对。
**不下载远程字体，也不启动 Vite 开发服务器**（runner 自己起一个静态 http server）。

### 前置条件

```sh
pnpm install --frozen-lockfile

# 1) 原生 FFI：runner 默认用 target/release/libffi.{dylib,so,dll}
cargo build --release -p ffi --locked

# 2) Node 侧产物：runner import 的是 cn-font-split/dist/node/index.js
pnpm -C packages/ffi-js build     # 或根目录 pnpm build

# 3) 浏览器：默认 WebKit（像素基线的唯一来源）
pnpm -C packages/test exec playwright install --with-deps webkit
```

若动态库不在默认位置，用 `CN_FONT_SPLIT_BIN` 指定绝对路径。

### 运行

```sh
# 校验（macOS + WebKit，像素比对；CI 的 visual-macos 就是这一条）
node packages/test/visual/run.mjs

# 首次或确认改动后重建基线（会改写 visual/baseline/*.png）
node packages/test/visual/run.mjs --update

# 只跑单个用例（cjk / vf / smiley）
node packages/test/visual/run.mjs --case=cjk

# 跨平台冒烟：不比对像素，只检查渲染、非空白截图、无 console/page error
node packages/test/visual/run.mjs --browser=chromium --smoke
```

退出码：`0` 全部通过；`1` 有用例失败（diff > 0.1%）；`2` 参数/环境错误
（找不到 FFI 动态库、未知浏览器等）。

产物：失败时的实际图与 diff 图在 `visual/temp/`，最新截图在 `visual/out/`，
两者都不入库（CI 失败时作为 artifact 上传）。

> 跨平台字体渲染存在系统性差异：Linux 只跑 `--smoke`，像素基线由 macOS/WebKit 维护。
> 换 Playwright 版本会改变 WebKit 渲染，`pnpm-workspace.yaml` 已精确锁定
> `playwright` / `playwright-core` 版本。

## e2e（本地手动，不在 CI）

`e2e/index.spec.ts`、`e2e/feature.spec.ts` 访问 `http://localhost:5173` 的
测试台页面，需要先准备演示数据并起 dev server：

```sh
# 可选：下载/构建测试台所需的演示字体（失败可重试）
node packages/test/script/downloadFonts.mjs
node packages/test/script/build.mjs

pnpm -C packages/test dev          # 另开一个终端，保持运行
pnpm -C packages/test test         # playwright test（testDir: e2e）
```

两点注意事项：

- `playwright.config.mjs` 没有 `webServer` 配置，dev server 必须自己先起，
  否则用例会在 `page.goto` 处超时。
- 这些用例依赖远程字体/完整演示数据，与本轮 8.0 的可复跑门禁目标不一致，
  **已从 CI 移除**（见 `docs/REFACTOR-8.0.md` §12「Feature 矩阵（远程字体）」）；
  文件保留，用于需要人工核对渲染效果时手动执行。

## 目录说明

```
packages/test/
├── visual/          # 视觉回归 runner（CI 门禁）
│   ├── run.mjs      # 入口
│   ├── page.html    # 渲染页面
│   ├── baseline/    # 入库的小集合基线图
│   ├── out/         # 运行时截图（gitignore）
│   └── temp/        # 失败 diff（gitignore）
├── e2e/             # Playwright 用例（本地手动）
├── script/          # 测试台演示数据的构建脚本（downloadFonts / build / article_build）
├── src/             # 测试台前端（Solid + Vite）
├── FeatureConfig.json
├── playwright.config.mjs
└── vite.config.ts
```
