# 开发者自助

## 环境

| 工具    | 版本             | 说明                                                   |
| ------- | ---------------- | ------------------------------------------------------ |
| Rust    | **1.85**（MSRV） | 由 `rust-toolchain.toml` 固定，含 `rustfmt` / `clippy` |
| Node.js | **>= 22**        | `engines.node`                                         |
| pnpm    | **12**           | `packageManager: pnpm@12.6.0`                          |

全新 clone 可以直接构建：**不需要 `cmake`，也不需要 `protoc`**。
生成的数据（`crates/lang_unicodes/data/*.dat`）与生成代码
（`crates/proto/src/lib/*.rs`、`packages/ffi-js/src/gen/*.ts`）均已入库。

```sh
pnpm install
cargo build --release
pnpm -C packages/ffi-js build
```

## 质量门禁

与 CI 的 `rust` job 一致：

```sh
cargo fmt --all --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --locked
cargo test --test failure_paths --locked
cargo build --release --locked
```

`tests/failure_paths.rs` 覆盖空输入、非字体、损坏 woff2、非法 `subsets` 与
`chunk_size = 0` 等错误路径。

## 重新生成（仅在改动数据源 / proto 时需要）

以下命令会重新生成已入库的文件，只有此时才需要额外工具链：

| 命令                                | 产物                              | 额外依赖                          |
| ----------------------------------- | --------------------------------- | --------------------------------- |
| `pnpm gen:unicodes`                 | `crates/lang_unicodes/data/*.dat` | `cmake`（`opencc-rs` 构建期依赖） |
| `pnpm gen:proto`                    | `crates/proto/src/lib/*.rs`       | `protoc`                          |
| `pnpm -C packages/ffi-js gen:proto` | `packages/ffi-js/src/gen/*.ts`    | `protoc`、`protoc-gen-ts`         |

生成后请检查产物 diff 并一并提交。

安装 protoc（仅重新生成 proto 时需要）：

```sh
apt update -y
apt install -y protobuf-compiler && protoc --version
```

## 测试与回归

### 视觉回归（macOS / WebKit，像素比对）

```sh
cargo build --release -p ffi
pnpm -C packages/ffi-js build
pnpm -C packages/test exec playwright install --with-deps webkit

node packages/test/visual/run.mjs            # 校验，三组均应为 0.000%
node packages/test/visual/run.mjs --case=cjk # 单用例
node packages/test/visual/run.mjs --update   # 环境漂移后重建基线
```

基线在 `packages/test/visual/baseline/`；`out/` 与 `temp/` 是临时产物。
Playwright 版本在 `pnpm-workspace.yaml` 精确锁定，升级浏览器后必须重建基线。

### 跨平台冒烟（Linux / Chromium）

```sh
pnpm -C packages/test exec playwright install --with-deps chromium
node packages/test/visual/run.mjs --browser=chromium --smoke
```

`--smoke` 只检查字体加载、截图非空、无 console error，不做像素比对，
避免跨平台渲染差异造成误报。

### Benchmark

```sh
cargo run --release --example bench -- --label v8-perf --rounds 5
```

结果写入 `bench-results/<label>/bench.{json,md}`。只做内存计算，不写字体分包文件。

## 平台包

交叉产物下载后（或本地构建后）生成 npm 平台包目录：

```sh
node scripts/build-platforms.mjs --platform darwin-arm64
node scripts/build-platforms.mjs --all
```

产物在 `dist-platforms/<platform>/`（已 gitignore），每个目录包含对应
`libffi-<triple>.<ext>` 与 `package.json`。发布流程：

```sh
cd dist-platforms/darwin-arm64
pnpm publish --dry-run      # 默认只 dry-run
```

## CI Job 说明

| Workflow                        | 触发     | 内容                                                          |
| ------------------------------- | -------- | ------------------------------------------------------------- |
| `ci.yml` / `rust`               | push、PR | fmt、clippy `-D warnings`、test、failure_paths、release build |
| `ci.yml` / `node`               | push、PR | pnpm 安装、构建 ffi + ffi-js + vite 插件、Node 合法/错误冒烟  |
| `ci.yml` / `visual-macos`       | push、PR | WebKit 像素回归，失败上传 `visual/out`                        |
| `ci.yml` / `visual-linux-smoke` | push、PR | Chromium 渲染冒烟，不比对像素                                 |
| `cross-build.yml`               | 手动     | 多 target 构建 + artifact；默认 dry-run                       |
| `test-cross-use.yml`            | 手动     | 在其它架构/发行版使用已发布包                                 |
| `test-font-feature.yml`         | 手动     | 本地字体（`packages/demo/public`）的 Chromium 特性冒烟        |
| `release-*.yml`                 | 手动     | 默认 dry-run；`inputs.publish=true` 才真实发布                |

## 发布（dry-run 优先）

1. 更新 `Cargo.toml` 的 `workspace.package.version`，然后：

    ```sh
    pnpm sync-version          # 同步所有 package.json
    pnpm sync-version:check    # CI 前自检
    ```

2. 本地打包检查：

    ```sh
    cd packages/ffi-js && pnpm pack --dry-run
    cd packages/vite && pnpm pack --dry-run
    ```

3. Rust crate：

    ```sh
    ./publish-all.sh           # 默认 cargo publish --dry-run
    ./publish-all.sh --publish # 仅确认后再真实发布
    ```

4. GitHub Actions：先跑 `cross-build.yml`（`dry_run=true`），确认 artifacts；
   需要 draft release 时设 `dry_run=false`、`create_release=true`。npm 发布在
   `release-*.yml` 中，默认 `publish=false` 只执行 `publish --dry-run`。

## 其它

-   Wasm-sdk：`.devcontainer/wasi-install.sh`，需在容器中执行。
-   `packages/server` 目前仍是独立 workspace，尚未收编到根 workspace。
