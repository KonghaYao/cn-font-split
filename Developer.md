# 开发者自助

## 构建前提

全新 clone 可以直接构建：**不需要 `cmake`，也不需要 `protoc`**。
生成的数据（`crates/lang_unicodes/data/*.dat`）与生成代码（`crates/proto/src/lib/*.rs`、
`packages/ffi-js/src/gen/*.ts`）均已入库。

```sh
pnpm install

cargo build --release            # 或 cargo test
pnpm -C packages/ffi-js build    # 构建 FFI 的 JS/TS 产物
```

## 重新生成（仅在改动数据源 / proto 时需要）

以下命令会重新生成已入库的文件，只有此时才需要额外工具链：

| 命令 | 产物 | 额外依赖 |
| --- | --- | --- |
| `pnpm gen:unicodes` | `crates/lang_unicodes/data/*.dat` | `cmake`（`opencc-rs` 构建期依赖） |
| `pnpm gen:proto` | `crates/proto/src/lib/*.rs` | `protoc` |
| `pnpm -C packages/ffi-js gen:proto` | `packages/ffi-js/src/gen/*.ts` | `protoc`、`protoc-gen-ts` |

生成后请检查产物 diff 并一并提交。

## 安装 protoc 命令（仅重新生成 proto 时需要）

```sh
apt update -y
apt install -y protobuf-compiler && protoc --version
```

## 安装 Wasm-sdk

安装并自动配置，执行文件在 .devcontainer/wasi-install.sh，需要在容器中执行

## 修复 vscode 不识别 tonic 的 proto 问题

```json
{
    "rust-analyzer.cargo.buildScripts.enable": true
}
```

## 构建失败

1. 只有 Ubuntu 24 是稳定的构建服务器，其他均未测试过，所以会有很多问题，请更换为官方镜像
2. 我们有标准的 github action 能够通过构建，你可以参考相关的配置，检查是否少了什么
