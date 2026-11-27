# cn-font-split Rust Version

## cn-font-split 代码架构

cn-font-split 由三段式管线（core）、事件协议层（protobuf）与多种语言绑定（wrapper）
组成。三者之间只通过 protobuf 定义的 wire IR 与事件流交互。

### 1. Core 核心层（`src/`）

core 负责字体分包本身。入口是 `src/runner.rs` 的 `font_split(config, callback)`：
先把 wire IR 解析成 `Config`，再依次执行三个阶段，每一阶段产出显式的类型
（`FontSource` → `PreSubsetOutput` → `RunSubsetOutput` → `LinkSubsetOutput`），
不再共享一个可变的 `Context`。

- 预分包（`pre_subset`）：在实际切割前决定「哪些字符进哪个分包」。内部是按
  固定顺序执行的插件表（`src/pre_subset/mod.rs` 的 `PIPELINE`）：
  `add_user_subset` → `language_area` → `add_remain_chars` → `auto_subset` →
  `font_features` → `reduce_min`。插件实现 `PreSubsetPlugin` trait
  （`name` / `enabled` / `apply`），顺序有单元测试断言。
- 批量分包（`run_subset`）：按 `chunkSize` 等配置调用 harfbuzz 逐个切出分包，
  产出 woff2 二进制、`SubsetDetail` 明细与 `BundleMessage`。
- 链接分包（`link_subset`）：**不产出字体二进制**，而是根据 `Config.css`、
  `name_table` 与可变字体轴信息，把上面得到的 per-subset 字符表渲染成 CSS
  （`@font-face` + `unicode-range`，按 `items.iter().rev()` 输出、可压缩），
  并附带 `index.html`（可选）与 `index.proto`。CSS 由 `src/link_subset/css/ast.rs`
  的结构化 AST 生成，不再是字符串拼接。

这些操作基于 harfbuzz 与 opentype 库实现，兼顾分包质量与速度。

### 2. 事件与协议层（protobuf，无独立「信道」模块）

输出侧没有单独的 message channel 模块：`src/message.rs` 用 `EventFactory` trait
在 `EventMessage` 上构造三类事件——`output_data`（文件名 + 二进制）、`END`、
`ERROR`。所有 wrapper 复用同一套事件语义：

1. 结构体传递：Rust 内部（`src/runner.rs` → `src/main.rs`）直接使用 protobuf 生成类型。
2. 二进制传递：跨语言时把 `EventMessage` 序列化后通过 callback / FFI / gRPC 传出，
   定义集中在 `crates/proto/src/index.proto`（`cn-font-proto`）。

`OutputReport`（`reporter.bin`）是同一套 proto 里的「构建报告」，与事件流分开：
包含版本、平台、`name_table`、`subset_detail`、`bundle_message` 与 CSS 元信息。

### 3. Wrapper 适配层

wrapper 是对外接口，按部署形态各有一个包：

- ✅ gRPC Wrapper（`packages/grpc`）：基于 HTTP/2 的独立构建服务。
- ✅ FFI Wrapper（`packages/ffi`）：C ABI 动态库（cdylib），跨语言用 protobuf 交换二进制。
- ✅ CLI Wrapper（`src/main.rs`，`cn-font-split` 可执行文件）：纯 Rust 命令行。
- ✅ WASI Wrapper（`packages/wasm-edge`）：`wasm32-wasip1` / `wasm32-wasip2` 产物。
  - 浏览器通过 `@tybys/wasm-util` 接入（`packages/ffi-js/src/wasm`）。
- ✅ Node / Bun / Deno / 浏览器（`packages/ffi-js`）：主 npm 包 `cn-font-split`。
- ⚠️ Python（`packages/ffi-py`）：best-effort，不阻塞发布。
- ⚠️ 服务端（`packages/server`）：8.0 冻结，见该包 README 的「冻结说明」。

## packages/ 地图

根 pnpm workspace 覆盖 `packages/**` 与 `crates/**`；根 Cargo workspace 的成员只有
`crates/*` 与 `packages/{ffi,grpc,wasmer,wasm-edge}` 这四个 Rust 包，其余 `packages/*`
是 pnpm 包，不参与 Cargo 构建。`packages/server` 是例外：它自带 `[workspace]` 与
`Cargo.lock`，被根 `Cargo.toml` 的 `exclude` 排除，单独构建。

| 目录 | 类型 | 说明 |
| --- | --- | --- |
| 仓库根 `src/`（crate `cn-font-split`） | Rust 库 + bin | 三段式管线与 `cn-font-split` CLI，版本真源在根 `Cargo.toml` |
| `packages/ffi` | Rust cdylib | C ABI，`dist-platforms/` 平台包的产物来源 |
| `packages/grpc` | Rust bin | gRPC 服务 |
| `packages/wasm-edge` | Rust cdylib | WASI（wasm32-wasip1 / wasip2） |
| `packages/wasmer` | Rust bin | `cli` crate，WASM 侧的入口程序 |
| `packages/ffi-js` | npm 主包 | `cn-font-split`：Node/Bun/Deno/浏览器/CLI；通过 `optionalDependencies` 分发 6 个原生平台包，两个 wasm 平台包独立发布、不随主包安装 |
| `packages/ffi-py` | Python | `cn_font_split`（best-effort，不发布 PyPI） |
| `packages/proto-to-cli` | npm | proto → TS 类型/CLI 生成工具，构建期依赖 |
| `packages/metrics` | npm | `cn-font-metrics`：字体度量与中文 fallback |
| `packages/vite` | npm | `vite-plugin-font`：Vite/Next/Nuxt/Webpack 插件 |
| `packages/font-replacer` | npm | `cn-font-replacer`：运行期字体替换 |
| `packages/font-sharp` | npm | `font-sharp`：字体转 SVG（基于 harfbuzzjs） |
| `packages/font-analyze` | npm | `font-analyze`：中文字符集检查工具 |
| `packages/test` | 私有 | 测试台 + 视觉回归 runner（唯一 CI 像素门禁在 `test/visual/`） |
| `packages/performance` | 私有 | 实验性性能测量，不参与构建与发布 |
| `packages/demo` | 静态资源 | 演示站点与 `public/` 下的本地测试字体 |
| `packages/server` | 独立 Rust | axum 构建服务，8.0 冻结（不参与构建/CI/发布） |

发布相关约定：

- 版本唯一真源是根 `Cargo.toml` 的 `[workspace.package].version`；
  `script/sync-version.mjs` 把版本写到各 `package.json` 的 `version` 与
  `@cn-font-split/*` 的 `optionalDependencies`，以及 Python 包的
  `packages/ffi-py/setup.py`（`setup(version="x.y.z")`）。
- 平台包目录 `dist-platforms/<platform>/` 由 `scripts/build-platforms.mjs` 从
  Rust 产物生成，不入库。
- 发布 workflow 全部默认 `publish=false`（dry-run）。

## 开发规范

### 命名规范

1. Rust 项目统一采用 snake_case, 会有 IDE 相应提示。

2. 包名统一用 `-` 链接，而不是 `_`。

### 开发环境

为统一不同开发环境，采用 VSCode Dev Container 方法

开发使用设备最好 MacOS 8GB、Windows 16GB 以上, 具备 Docker 环境，一键进入开发状态！

如果遇到某些依赖没安装，可以参考 [Developer.md](./Developer.md)

### 测试流程

- Rust：`cargo test --locked`、失败路径 `cargo test --test failure_paths --locked`。
- 视觉回归：`node packages/test/visual/run.mjs`（细节见 `packages/test/README.md`）。
- Node 侧单测：`pnpm -C packages/ffi-js test`、`pnpm -C packages/vite test`。
- CI 门禁见 `.github/workflows/ci.yml`（Rust fmt/clippy/test/build、Node 构建与冒烟、
  macOS WebKit 像素回归、Linux Chromium 冒烟），另有版本同步与许可证检查 job。
