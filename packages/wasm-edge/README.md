# wasm 构建子项目

这个项目将构建出 cn-font-split 的 `wasm32-wasip1` 与 `wasm32-wasip2` 目标，可以运行在浏览器上。

构建需要依赖 wasi-sdk 和 wasm-opt, 安装脚本在这里

`.devcontainer/wasi-install.sh`
`.devcontainer/wasm-opt-install.sh`

项目构建方式

`build-wasi.sh`（`wasm32-wasip1`）。CI 同时构建两个目标，其中 `wasm32-wasip2` 需要
`CXXFLAGS=-fno-exceptions`（见 `.github/workflows/cross-build.yml`）。

产物与发布：

- CI 把 `wasm_edge[.Oz].wasm` 重命名为 `libffi-<triple>.wasm`
  （例如 `libffi-wasm32-wasip1.wasm`），以 `bindings-<triple>` artifact 上传
  （保留 14 天）。
- `scripts/build-platforms.mjs` 据此生成 `@cn-font-split/wasm32-wasip1` 与
  `@cn-font-split/wasm32-wasip2` 两个平台包；它们独立发布，不随主包安装。
- 浏览器侧经 `@tybys/wasm-util` 的 `WASI` 接入，见
  `packages/ffi-js/src/wasm/index.ts`。
