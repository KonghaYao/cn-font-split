# cn-font-split 8.0 维护翻新与重构计划

> 状态：已执行（8.0 交付，遗留项见 §12）
> 基线：`release` 分支 HEAD（`1650af1`，2026-06-12）
> 目标版本：`8.0.0`
> 记录时间：2026-11-25

## 1. 背景

项目核心（Rust 约 3.3k 行、TS 约 2.4k 行）功能完整，但工程化层面积累了大量维护债：

- 版本真相不一致：`Cargo.toml` 为 `7.4.0`、`packages/ffi-js/package.json` 为 `7.4.3`、根 `package.json` 为 `3.4.2`、tag 最高为 `7.6.8`。
- 分支分叉：`7.6.8` tag 位于与 `release` HEAD 分叉的提交线上。其 Rust 侧差异仅为 `src/loader.rs` 的 lifetime 语法；主要差异是 CI/WASM 构建链与 Windows gnu 修复，因此回补以重写 CI 为主，不需要合并历史提交。
- 本地构建门槛高：`cargo check` 需要 `cmake`（`opencc-rs`，见 `crates/lang_unicodes/build.rs`）与 `protoc`（`crates/proto/build.rs`），与 `Developer.md` 描述不符；build.rs 还会把生成代码写入源码树 `crates/proto/src/lib`。
- 没有质量门禁：所有 GitHub Actions 均为 `workflow_dispatch` 手动触发，无 PR/push 的 build + test。
- 分发链路脆弱：npm 包 `postinstall` 从 GitHub Releases 下载二进制；依赖已弃用的 `google-protobuf`、`set-value`，以及锁死的 `koffi 2.10.0`。
- 依赖偏旧：`woff 0.3.4`、`md5 0.7`、`opentype 0.38`、自维护 fork `harfbuzz_rs_now 2.3.2`；CI 仍使用已归档的 `actions-rs/toolchain`、`actions/create-release@v1`。
- 代码可维护性：核心路径大量 `unwrap/expect`，`Context` 为大结构体，插件函数签名重复，配置在 proto / CLI / TS 三处手工重复。

## 2. 已锁定决策

| 维度 | 决策 |
| --- | --- |
| 范围 | 工程化翻新优先，随后重构；允许大版本 breaking |
| 基线 | 以当前 `release@HEAD` 为准；回补 7.6.8 的 CI/WASM 构建链与 Windows gnu 修复 |
| 版本 | 核心及所有对外包统一 `8.0.0`；`test` 私有包保持 `0.0.0` |
| 平台 | Node/Bun/浏览器为主线；Deno/Python/WASI/gRPC/server 为 best-effort（编译通过与 smoke，不阻塞发布） |
| 依赖 | 全面升到最新；`harfbuzz_rs_now 2.3.2` 冻结 |
| 构建 | 预生成数据入库 + 平台包 `@cn-font-split/<platform>` 走 `optionalDependencies`，移除 postinstall 下载 |
| 工具链 | Rust Edition 2024 / MSRV 1.85 / Node >= 22 |
| 产物契约 | 指纹换 blake3，`[hash:6]` 模板语法保留，CSS 允许重写 |
| 协议 | proto 保留为内部 IR，对外只暴露类型化 TS API |
| 回归基线 | 视觉回归为唯一回归基线；Mac/WebKit 验收 + Linux Chromium smoke；小集合截图入库、全量进 artifact |
| 仓库 | `packages/demo/public` 下 18MB 字体保留不动 |
| 节奏 | 单分支 `refactor/8.0`，分阶段 commit，最后合并为一个 PR |
| 发布 | 改 CI 与发布脚本，只跑 dry-run，不实际发布 |
| 完成标准 | 合并到 `release` 且 8.0 可发布 |

## 3. 终态目标

- 单一版本源：`Cargo.toml` 为唯一版本真源，所有对外包同步 `8.0.0`，CI 不再用 `sed` 注入版本。
- 干净 clone 可构建：不需要 `cmake` 与 `protoc`；生成数据与生成代码入库，并有显式重生成命令。
- 平台二进制由包管理器解析：主包通过 `optionalDependencies` 获取 `@cn-font-split/<platform>`，不再在安装期联网下载。
- 质量门禁：PR/push 自动执行 fmt、clippy、测试、构建、Node smoke、Linux 视觉 smoke；多平台交叉编译与 WASI 由手动 workflow 执行 dry-run。
- 错误可恢复：核心路径 panic 清零，FFI/CLI 返回结构化错误。
- 性能可量化：benchmark 报告可复跑，8.0 与 v7 基线可对比。
- 视觉一致：Mac/WebKit 视觉回归 100% 对齐。

## 4. Phase 0：基线与安全网（已完成）

目标：在任何改动前建立可复跑的对照证据。

- [x] 0.1 记录基线 commit，并在本地打 `v7-baseline` tag（不推送）。
- [x] 0.2 新建 `examples/bench.rs`：固定 4 个 demo 字体与 3 组配置，输出构建时间、总字节、分包数、单包大小分布（JSON + Markdown）。
- [x] 0.3 视觉验收 runner：`packages/test/visual/`，使用仓库内本地字体 + WebKit，支持 `--update` 与 `--case`；基线小集合入库。
- [x] 0.4 失败用例 fixture：`tests/failure_paths.rs`（空 buffer、非字体、损坏 woff2、非法 subsets、`chunkSize=0` 挂起）。
- [x] 0.5 归档 v7 视觉基线图与 benchmark 报告。

验收：`node packages/test/visual/run.mjs` 在 HEAD 通过（三组均 0.000% diff）；`bench-results/v7-baseline/` 已产出。

> 现有 `packages/performance` 依赖 Bun 与浏览器，不满足可复跑要求，由新 harness 取代；旧包保留但标记为实验。

## 5. Phase 1：工程化翻新（5–8 天，不改行为）

### 5.1 单一版本源

- [x] `Cargo.toml`、所有 `package.json` 统一 `8.0.0`。
- [x] 删除 CI 中的 `sed` 版本注入。
- [x] 内部 path 依赖统一写法，去掉写死的 `7.0.0` / `7.2.1` / `7.4.0`。
- [x] 修复全新 clone 的安装链路：`preinstall` 不要在依赖安装前 `import fs-extra`；修正 `packages/vite` 的 `workspace:^*`；把 `package.json#pnpm.overrides` 迁移到 `pnpm-workspace.yaml`（pnpm 12 已忽略旧位置）。

### 5.2 构建可复现

- [x] `lang-unicodes`：一次性脚本生成 `data/*.dat` 并入库，`build.rs` 去掉 `opencc-rs`，消除 cmake 依赖；保留 `pnpm gen:unicodes` 重生成脚本。
- [x] `proto`：生成代码进 `OUT_DIR` 并入库，`build.rs` 不再写源码树；TS 生成代码同样入库；使用方不再需要 protoc。
- [x] 新增 `rust-toolchain.toml`、`rust-version = "1.85"`、`engines.node >= 22`、`packageManager`。

### 5.3 依赖升级（harfbuzz 除外，每类单独 commit）

- [ ] Rust：`prost/tonic`、`opentype`、`woff`、`rayon`、`indexmap`、`regex`、`clap`、`chrono`、`log/env_logger` 升到最新可用版本。
- [x] Rust 替换：`md5 → blake3`；`lazy_static → std::sync::LazyLock`；移除无用依赖。
- [x] Node：`vite 8`、`typescript`、`koffi`（解禁并重验 ABI）、`commander`、`fs-extra` 升到最新。
- [x] Node 移除：`google-protobuf`（已迁 `@bufbuild/protobuf` 2.17，见 `MIGRATION-8.0.md` §5.1）；`set-value`。
- [x] CI：`actions-rs/toolchain` → `dtolnay/rust-toolchain`；`actions/create-release@v1` → `softprops/action-gh-release`；`checkout@v5`、`setup-node@v4`。
- [ ] 每类升级后运行 benchmark 与视觉回归并记录变化。

### 5.4 CI 门禁

- [x] PR/push：`cargo fmt --check`、`cargo clippy -D warnings`、`cargo test`、`pnpm build`、Node smoke、Linux Chromium 视觉 smoke。
- [ ] 手动：全平台 cross-build dry-run + `wasm32-wasip1` / `wasm32-wasip2`。

### 5.5 测试整理

- [x] 移除 `src/lib.rs` 中会写 `dist/` 的裸测试；字体依赖测试迁到 `tests/` 并使用显式 fixture。
- [x] 失败用例先以 `#[ignore]` 记录现状，Phase 2 转正。

### 5.6 文档与发布

- [x] 更新 README（版本、Node 要求、安装方式）；`Developer.md` 删除 cmake/protoc 要求；新增 `MIGRATION-8.0.md`。
- [x] 平台包：`@cn-font-split/{darwin-arm64, darwin-x64, win32-x64-msvc, win32-arm64-msvc, linux-x64-gnu, linux-arm64-gnu, wasm32-wasip1, wasm32-wasip2}`。
- [x] 主包使用 `optionalDependencies` + `os/cpu` 解析，保留 `CN_FONT_SPLIT_BIN` 覆盖。
- [ ] dry-run 产出 artifacts，成功但不发布。

### 5.7 仓库整理

- [ ] `packages/server` 的独立 workspace/Cargo.lock 收编或显式排除。
- [ ] 各包 license 统一为 Apache-2.0（`cn-font-replacer` 的 MIT 需确认后改）。
- [x] 修正 `.gitignore` 与实际生成目录不一致的问题。

验收：全新 clone → `pnpm install` → `cargo test` → `pnpm build` 在 Node 22/24、macOS/Linux 通过；产出 benchmark 对比报告。

## 6. Phase 2：核心重构（8–12 天）

### 6.1 错误模型（优先）

- [x] 引入 `thiserror` 错误枚举，`font_split` 返回 `Result`；事件流增加 Error 事件（proto 内部 IR 调整）。
- [x] FFI 边界 `catch_unwind` + 错误事件；CLI 返回非零退出码。
- [ ] 核心路径 panic 清零（测试除外），补齐输入校验。

### 6.2 配置与 API 单一来源

- [ ] Rust `Config` builder，默认值集中；proto 仅作序列化层。
- [ ] TS 暴露稳定手写类型；CLI 参数从 `Config` 派生，消除三处手工重复。
- [ ] `subsets` 改为 `repeated uint32`；`chunk_size` 改为 `u32`；统一 camelCase/snake_case 映射。

### 6.3 模块拆分

- [x] `Context` 拆为阶段化输出（`PreSubsetOutput` / `RunSubsetOutput` / `LinkSubsetOutput`）。
- [x] 插件改为 trait + 显式顺序表（`PreSubsetPlugin` + `PIPELINE`，顺序有单测）。
- [ ] `used_languages` 并入 `SubsetMeta`（仍是 `PreSubsetContext.used_languages`）。
- [x] CSS 生成结构化（`FontFace` → 序列化）；`name_template` 自研小型 parser，去掉 `regex`。

### 6.4 产物质量

- [ ] 分包按实际压缩体积迭代，替换当前 `bytes/char + cbrt` 估算。
- [ ] 字符遗漏从 `warn` 改为可配置 error。
- [ ] 可变字体字重与 OpenType 特性纳入视觉基线。
- [x] blake3 指纹落地。

### 6.5 性能

- [ ] benchmark 驱动：先 profile 再改，重点关注重复 `collect_unicodes`、woff2 压缩并行、中间拷贝与分配。
- [x] 修复 `plugin_auto_subset` 的采样 bug：`space = (size / 100).min(1)` 实际恒为 `1`（等于全量采样）；已改为 1000 字符等距采样 + 两点校准，见 §11.6。
- [ ] 初拟目标（以 Phase 0 数据最终校准）：构建时间 −25%、总产物体积 −10%、分包数不增。

### 6.6 多端收敛

- [ ] Node/Bun/浏览器主链路全绿。
- [ ] Deno/Python/WASI/gRPC/server 仅要求编译通过 + smoke。

验收：benchmark 达标；Mac/WebKit 视觉 100% 对齐；Linux smoke 通过；8.0 dry-run 发布成功；迁移指南可执行。

## 7. 依赖升级清单

| 层 | 升级 | 风险 |
| --- | --- | --- |
| Rust 核心 | `opentype`、`woff`、`prost/tonic`、`rayon`、`indexmap`、`regex`、`clap`、`chrono` | 中 |
| Rust 替换 | `md5 → blake3`、`lazy_static → LazyLock` | 低（指纹变化已允许） |
| Rust 冻结 | `harfbuzz_rs_now 2.3.2` | 无 |
| Node | `vite 8`、`typescript`、`koffi`、`commander`、`fs-extra` | 中（koffi ABI） |
| Node 移除 | `google-protobuf`、`set-value` | 中（proto TS 运行时迁移） |
| CI | 已归档 action 全部替换 | 低 |
| 工具链 | Edition 2024 / MSRV 1.85 / Node >= 22 | 低 |

具体目标版本在实施时通过 `cargo update` / `pnpm up` 解析，以当时最新稳定版为准。

## 8. 风险与对策

| 风险 | 对策 |
| --- | --- |
| 一次性大 PR 审查成本 | 单分支分阶段 commit，每阶段可独立回退；阶段验收后再进入下一阶段 |
| `google-protobuf` 迁移工作量 | 先做 spike；迁不动就保留并记 TODO，不阻塞主线 |
| `koffi` 升级 ABI 断裂 | 平台包 smoke + Node/Bun 双端验证 |
| blake3 指纹破坏下游缓存 | 迁移指南 + 可选 md5 兼容开关（默认 blake3） |
| 视觉环境漂移 | 锁定 Playwright/浏览器版本、固定字体、设定像素容差 |
| benchmark 波动 | 固定输入与配置，多轮取中位数 |
| 平台包发布命名/权限 | dry-run 验证全部 artifact，不实际 publish |

## 9. 明确不做

- 不升级 harfbuzz（核心与绑定）。
- 不把字体二进制移出仓库。
- 不实际发布 8.0。
- 不加新功能（只做性能、产物质量、错误处理、使用体验）。
- 不删除 best-effort 平台包。

## 10. 交付物

1. `refactor/8.0` 分支 + 分阶段 commit + 单个 PR。
2. benchmark 报告（v7 vs v8）。
3. 视觉验收报告 + 基线小集合。
4. `MIGRATION-8.0.md`。
5. CI dry-run artifacts（含两个 WASI target）。
6. 发布 SOP。

## 11. Phase 0 执行记录（已完成）

### 11.1 环境

- 基线 commit：`1650af1`；本地 tag：`v7-baseline`（未推送）。
- macOS 26.5.1 / Apple Silicon；Node 24.21.0；pnpm 12.6.0；Rust 1.98.1。
- 临时安装：`cmake 4.5.1`、`libprotoc 36.2`（Homebrew，已使用 USTC/TUNA 镜像）。
- `cargo build --release --example bench` 通过；`cargo test --test failure_paths` 通过。

### 11.2 Benchmark 基线

报告：`bench-results/v7-baseline/bench.md`（JSON 同目录）。

| 字体 | 配置 | 中位耗时 | woff2 总量 | 分包数 | 单包 min/median/max |
| --- | --- | ---: | ---: | ---: | --- |
| NotoSerifSC | default | 274.5ms | 8,703,824 | 223 | 1,440 / 41,900 / 87,080 |
| NotoSerifSC | chunk-48k | 464.8ms | 8,831,632 | 301 | 788 / 31,224 / 72,200 |
| NotoSerifSC | chunk-120k | 602.9ms | 8,522,124 | 149 | 2,824 / 61,344 / 122,540 |
| SmileySans TTF | default | 83.8ms | 1,343,376 | 46 | 848 / 32,388 / 62,156 |
| SmileySans WOFF2 | default | 144.0ms | 1,655,948 | 59 | 876 / 29,416 / 60,664 |
| WorkSans VF | default | 28.4ms | 211,524 | 9 | 1,780 / 4,544 / 157,996 |

关键观察：

- `chunk-120k` 相比 default 分包数 −33%、总体积 −2.1%，但耗时 +120%；默认 70KB 是当前速度/体积的折中点。
- WorkSans VF 出现 158KB 的单包，远超 70KB 目标，说明分包估算对小字符集/可变字体不准确。
- 同一字体重复运行波动较大（如 SmileySans min 54ms / max 94ms），后续 benchmark 需要更多轮次与中位数。

### 11.3 失败路径基线

`tests/failure_paths.rs` 已记录当前行为：

- 空输入、随机字节：`opentype::Font::read` panic。
- 截断的 `wOF2`：`decompress` panic（`illegal woff2 file`）。
- `subsets` 字节长度非 4 的倍数：`assert!` panic。
- `chunk_size = 0`：`split_vector` 死循环（用例保持 `#[ignore]`）。

### 11.4 Phase 0 新发现（已并入上方清单）

1. 全新 clone 的 `pnpm install` 必然失败：根 `preinstall` 在依赖安装前 `import fs-extra`。
2. `packages/vite/package.json` 的 `workspace:^*` 是非法 spec，pnpm 12 直接拒绝解析。
3. pnpm 12 不再读取 `package.json#pnpm.overrides`，现有的安全 override 实际全部失效，需要迁移到 `pnpm-workspace.yaml`。
4. `plugin_auto_subset` 的 `space = (size / 100).min(1)` 恒等于 1，导致每次都用全量字符做压缩采样；应改为 `max(1)`，这是当前最大的性能疑点。
5. `chunk_size = 0` 会死循环；`max_allow_subsets_count`、`chunk_size_tolerance`、`build_mode`、`multi_threads` 在核心实现中未被使用。
6. `packages/test` 的字体下载依赖 `cors-cdn.deno.dev` 代理，且 VF 用例需要 30MB 远程字体，不适合作为稳定基线。
7. 视觉基线改为 `packages/test/visual/`：使用仓库内本地字体（CJK、可变字重、第二中文字体）+ WebKit + 元素截图，离线可复跑；基线小集合提交入库。

### 11.5 视觉基线

位置：`packages/test/visual/`

- 用例：`cjk`（NotoSerifSC）、`vf`（WorkSans VF，300/500/800 三档字重）、`smiley`（SmileySans）。
- 基线：`baseline/cjk.png`（231KB）、`baseline/vf.png`（72KB）、`baseline/smiley.png`（100KB）。
- 校验：`node packages/test/visual/run.mjs` 连续通过，三组均 `0.000% diff`。
- 更新：`node packages/test/visual/run.mjs --update`。
- 运行前提：`cargo build --release -p ffi`、`packages/ffi-js/dist` 已构建、Playwright WebKit 已安装；脚本会自动使用 `target/release/libffi.{dylib,so,dll}`。
- 产物目录 `visual/out` 与 `visual/temp` 已加入 `packages/test/.gitignore`。

注意：`examples/bench.rs` 是纯内存计算（不写磁盘）；同一次 CJK 分包在 Node 端到端（含 223 个文件写盘）为 713ms，而 benchmark 为 274ms。Phase 2 需要补一个端到端 benchmark，避免只用计算耗时做性能结论。

2026-11-25 重新对齐：此前 1.55.x 时代的基线已因 Playwright/WebKit 环境漂移失效（Playwright 1.55.x → 1.65.1、WebKit 2104 → 2388，表现为 `cjk`/`smiley` 截图高度 +2px、`vf` 0.042%，与代码无关）。现已在 `pnpm-workspace.yaml` 的 overrides 中把 `playwright` 与 `playwright-core` 精确锁定为 `1.65.1`（`packages/test/package.json` 的 `@playwright/test` 同步固定），并用该版本 / WebKit 2388 重新生成三张基线（`cjk` 1800x1346、`vf` 1800x608、`smiley` 1800x642）；连续两次校验均为三组 `0.000% diff`。升级 Playwright 或切换 WebKit 版本时必须同步重跑 `node packages/test/visual/run.mjs --update`。

### 11.6 性能修复记录

**问题**：`plugin_auto_subset` 的 `space = (size / 100).min(1)` 恒为 1（`size < 100` 时为 0，被 `extract_every_nth` 兜底），等于每次估算都对全量字符做一次 subset + woff2 压缩。NotoSerifSC 30928 字符单次压缩 193ms，占 default 用例（238ms）的 81%。

**方案**（commit `d6e5d2b`，文件 `src/pre_subset/plugin_auto_subset.rs`）：

1. 采样：按 `ceil(size / 1000)` 等距取样，估算最多 subset + 压缩 1000 个字符；字体本身 ≤1000 字符时仍全量压缩，结果与修复前一致。
2. 校准：两点采样（约 100 与大样本，嵌套，共 2 次压缩）拟合 `bytes ≈ overhead + per_char * chars` 与幂律指数 `p`（`bytes ≈ c * n^p`），把大样本体积外推到字体真实字符数，再按「全字体平均字节/字符」求 `chars_per_subset`。
   - 实测 `overhead`：NotoSerifSC 4.4KB、SmileySans 4.9~6.5KB、WorkSans VF 21.4KB。
   - 实测 `p`：0.936~0.956；外推后平均字节/字符与全量压缩的误差 ≤2%（Noto 240 vs 236，Smiley 141 vs 144）。
3. 未采用字面公式 `(target - overhead) / per_char`：每个分包预留一份固定开销，实测分包数 +17%~24%（下表 A 组），直接违反 ≤5% 约束；改为上述语义并保留代码注释与测量报告。
4. 兜底：空字符集直接跳过；模型退化（体积不增、边际字节非正、指数非有限）回退单点平均；`bytes_per_char <= 0`/非有限至少 1 字符；`target <= overhead` 按边际字节退让。

对照（5 轮中位数；`bench-results/v8-perf`，v7 为 `v7-baseline`）：

| 字体 / 配置 | v7 ms | pre ms | v8 ms | Δtime | woff2 pre→v8 | Δbytes | 分包 pre→v8 | Δsubs | 单包 max pre→v8 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| NotoSerifSC default | 274.5 | 237.9 | 73.6 | −69.1% | 8,703,824→8,667,296 | −0.42% | 223→210 | −5.8% | 87,080→85,504 |
| NotoSerifSC chunk-48k | 464.8 | 235.9 | 75.1 | −68.1% | 8,831,632→8,790,656 | −0.46% | 301→281 | −6.6% | 72,200→70,404 |
| NotoSerifSC chunk-120k | 602.9 | 232.7 | 68.9 | −70.4% | 8,522,040→8,498,224 | −0.28% | 149→142 | −4.7% | 122,540→124,244 |
| SmileySans TTF default | 83.8 | 32.3 | 13.4 | −58.5% | 1,343,376→1,344,516 | +0.08% | 46→47 | +2.2% | 62,156→60,644 |
| SmileySans TTF chunk-48k | 105.8 | 33.3 | 13.6 | −59.2% | 1,363,272→1,365,956 | +0.20% | 62→64 | +3.2% | 47,192→46,196 |
| SmileySans TTF chunk-120k | 72.7 | 35.8 | 12.9 | −64.0% | 1,314,548→1,317,300 | +0.21% | 34→34 | 0.0% | 91,192→87,628 |
| SmileySans WOFF2 default | 144.0 | 57.3 | 30.9 | −46.1% | 1,655,948→1,661,324 | +0.32% | 59→63 | +6.8% | 60,664→57,636 |
| SmileySans WOFF2 chunk-48k | 169.2 | 56.3 | 31.6 | −43.9% | 1,677,684→1,679,728 | +0.12% | 79→82 | +3.8% | 46,428→44,316 |
| SmileySans WOFF2 chunk-120k | 107.3 | 54.8 | 31.3 | −42.8% | 1,627,532→1,627,388 | −0.01% | 42→44 | +4.8% | 88,788→83,524 |
| WorkSans VF default | 28.4 | 13.2 | 13.6 | +3.0% | 211,524→211,524 | 0 | 9→9 | 0.0% | 157,996→157,996 |
| WorkSans VF chunk-48k | 43.1 | 13.1 | 15.0 | +14.5% | 208,000→208,000 | 0 | 8→8 | 0.0% | 157,996→157,996 |
| WorkSans VF chunk-120k | 25.2 | 13.1 | 13.8 | +5.1% | 208,000→208,000 | 0 | 8→8 | 0.0% | 157,996→157,996 |
| **合计** | 2121.7 | 1015.5 | 393.6 | −61.2% | 35,667,380→35,579,912 | −0.25% | 1020→992 | −2.7% | — |

A 组（被否定的字面公式，单轮，仅供对照）：NotoSerifSC 分包 223/301/149 → 271/372/175（+21.5%/+23.6%/+17.4%），总字节 +0.9%/+1.25%/+0.8%，单包 max 降至 77,296/75,108/97,276。

**验收**：

- CJK 三组耗时 −69.1% / −68.1% / −70.4%，≥20% ✓；总 woff2 字节 −0.25%，单用例最大 +0.32% ≤1% ✓。
- 分包数合计 −2.7%；单用例仅 SmileySans WOFF2 default 为 +6.8%（59→63，语言组在字符数下降 0.9% 时的离散边界跳变），其余 ≤+4.8%。按合计口径达标，按单用例口径该例超出 1.8pp，已记录。
- WorkSans VF 单包 max 157,996 逐字节不变 ✓。耗时 +3.0%/+14.5%/+5.1% 与产物无关（字节、分包数、单包 max 完全一致，代码路径与修复前相同），9 轮聚焦复测中位 13.6~13.8ms，判定为测量噪声。
- 复跑方式：`./target/release/examples/bench --label v8-perf --rounds 5`。

**回退与未做**：

- 字面公式 `(target - overhead) / per_char` 已回退（A 组数据），仅保留注释与本节测量。
- 可选项「超 `chunk_size * (1+tolerance)` 的二分拆分后处理」未实现：它会让 Noto 分包与总字节回升，并把 WorkSans 9 包拆成 ≥10 包（+11%），与 ≤5% 分包约束冲突；且 `chunk_size_tolerance` 至今未在 Rust 侧接线。建议在 8.x 单独设计「按实测体积收敛」的分包算法，同时解决 WorkSans 158KB 单包。
- 探测观察：对 NotoSerifSC 取 16000 个字符做单次 subset 会触发 harfbuzz `hb-serialize.hh:434` assert（全量 30928 字符与生产用的小分包均正常），属既有 harfbuzz 行为，与本改动无关，记为观察项。


## 12. 8.0 交付状态与遗留

8.0 主线已具备可复跑的本地门禁：`fmt` / `clippy -D warnings` / `test` /
`failure_paths` / release build / Node 冒烟 / WebKit 视觉三组 `0.000%` 全部通过。
下表逐项记录 8.0 收尾状态（已完成 / 延后 / 未实测）：

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| `Context` 拆分与阶段产物类型 | 已完成 | 拆为 `FontSource` + `PreSubsetOutput` / `RunSubsetOutput` / `LinkSubsetOutput`；`runner::Context` 已删除（见 `MIGRATION-8.0.md`） |
| plugin trait 与显式顺序表 | 已完成 | `src/pre_subset/plugin.rs` 定义 `PreSubsetPlugin`（`name` / `enabled` / `apply`），`src/pre_subset/mod.rs` 用 `static PIPELINE: &[&dyn PreSubsetPlugin]` 声明顺序，并有 `pipeline_order_is_stable` 单测锁住顺序；文档化的顺序约束见该文件顶部注释 |
| CSS 结构化 / AST | 已完成 | `src/link_subset/css/ast.rs`：`Stylesheet` / `CssNode` / `FontFace` / `SrcItem` 结构化类型，渲染结果与历史字符串拼接逐字节一致；`output_css.rs` 只组装 AST |
| Rust Config builder / 单一配置源 | 延后 | proto 仍是配置事实来源，CLI 参数直接构造 `InputTemplate`，未引入 Config builder 与派生 |
| `name_template` 解析器化 | 已完成 | `src/link_subset/name_template.rs` 改为手写解析器（`Placeholder` + `is_word`），`regex` 依赖已从 `Cargo.toml` 移除；`\w` 语义用两张差集表（`WORD_EXTRA` / `NOT_WORD`）与旧正则逐码位对齐 |
| 按实测体积迭代的分包算法 | 延后 | 仍是「采样 + 两点校准」估算；WorkSans VF 单包 157,996B（≈158KB）仍然存在，未按实测体积收敛 |
| `google-protobuf` 迁移 | 已完成 | `packages/ffi-js` 改用 `@bufbuild/protobuf` 2.17（生成器 `@bufbuild/protoc-gen-es` 同版本，`protoc --es_out`）；`packages/test` 的未使用依赖已移除；类型改名见 `MIGRATION-8.0.md` §5.1 |
| `woff 0.6.x` | 延后 | 仍为 `woff 0.4.0`；0.5+ 在解码失败时执行 `debug_assert`，会破坏 `truncated_woff2` 的错误返回。0.4.0 的 woff2 C++ 源码缺 `#include <cstdint>`，GCC 13+ 需用 `CXXFLAGS=-include cstdint` 编译（CI 已设置） |
| `prost` / `tonic 0.14` | 延后 | 仍为 `prost 0.13.5`；0.14 的 MSRV 为 1.88，高于本项目 1.85 |
| Bun / Deno 平台包解析 | 已完成 | `resolveBinPath` 抽到 `load.ts`，node / bun / deno 共用：env → `createRequire` 解析 `@cn-font-split/<platform>` → 本地 `dist` 回退 → 报错列出尝试项（`8216776`） |
| wasm 平台包 | 未实测 | `wasm32-wasip1/p2` 有构建 workflow 与加载入口，但本轮未做发布验收 |
| `packages/server` 独立 workspace | 延后 | 仍带独立 `Cargo.toml` / `Cargo.lock`，未收编或显式排除 |
| 端到端（含写盘）benchmark | 已完成 | `packages/ffi-js/scripts/bench-e2e.mjs`：内存 sink 与真实写盘各跑一轮，产物逐字节一致；结果入库 `bench-results/e2e-v8/`（`5c321e8`） |
| Feature 矩阵（远程字体） | 延后 | 旧 `FeatureConfig` 依赖远程 CDN 字体，已从 CI 移除；`test-font-feature` 改为本地字体 Chromium 冒烟 |
| 全平台 cross-build dry-run artifacts | 未执行 | `cross-build.yml` 已重写并通过 YAML 解析，但未实际触发远端构建 |

其他已知观察项保持原状：

- `chunk_size_tolerance` / `max_allow_subsets_count` / `build_mode` / `multi_threads`
  的现状：`multi_threads=false` 已走顺序构建、`build_mode` 已枚举化、
  `chunk_size_tolerance` 非 0 会被显式拒绝；`max_allow_subsets_count` 仍只校验 `> 0`，
  完整语义与「按实测体积迭代分包」一起做（`2835776`）。
- 许可证已统一为 Apache-2.0（7 个发布包 + `script/check-licenses.mjs` 校验）。
- `performance` 为实验包，已标记 `private: true`，不参与发布。
- `font-sharp` / `font-analyze` 已修复构建并纳入根构建。`font-sharp` 现已可用：
  `main` / `types` / `exports` 指向真实产物 `dist/index.js` 与 `dist/index.d.ts`；
  运行时用 `createRequire(import.meta.url)` 定位 `@konghayao/harfbuzzjs/hbjs.js`，
  再按 CJS 语义同步求值取出工厂函数，`hb.js` 的 wasm wrapper 仍按 ESM `import` 加载。
  原因：上游 `@konghayao/harfbuzzjs@9.0.5` 的 `hbjs.js` 只有 `module.exports`，包却声明
  `"type": "module"`，静态 `import` 会抛 `does not provide an export named 'default'`，
  而直接 `require` 只会得到空命名空间（赋值被包内 `try/catch` 吞掉）。`font2svg` 冒烟
  （`SmileySans-Oblique.ttf`，文本 `AB`）返回非空 SVG 字符串；若上游补
  `export default hbjs`，可去掉这段加载垫片。
- 视觉基线仍只覆盖 macOS/WebKit；Linux 仅做 Chromium 渲染冒烟。

## 13. 8.0 验收记录（2026-11-25）

独立验收（非实现者）在**全新 clone** 上完成，11/11 PASS：

- 环境：`refactor/8.0` @ `5f17a82`，rustc 1.85.0 / Node 24.21.0 / pnpm 12.6.0；
  PATH 剥离 Homebrew，`cmake` 与 `protoc` 均不可用。
- Rust：`cargo build --release --all-targets` 通过；`cargo test` 33 passed；
  `failure_paths` 9 passed / 0 ignored；`lang-unicodes` 2 passed；
  `cargo fmt --check` 通过；`clippy --workspace --all-targets -D warnings` 通过。
- Node：`pnpm install --frozen-lockfile` + `pnpm build`（proto-to-cli / metrics /
  ffi-js / vite / font-sharp / font-analyze）全部通过；删光 dist 后重跑仍通过。
- 视觉：WebKit 三组 `cjk` / `vf` / `smiley` 均 `0.000% diff`，runner 退出码 0。
- 发布包：`@cn-font-split/darwin-arm64` tarball + `cn-font-split` tarball 在 /tmp
  空项目安装后真实构建，47 个 woff2、退出码 0；`font-sharp` tarball 消费端
  `font2svg` 返回非空 SVG。
- 版本：workspace 与 8 个对外包 8.0.0，`test` 0.0.0，`performance` private；
  `harfbuzz_rs_now` 保持 2.3.2。
- 性能（`v8-perf`，5 轮中位数 vs `v8-pre-perf`）：总耗时 −61.2%，woff2 总字节
  −0.25%，分包数 −2.7%；CJK 三组 −68% ~ −70%。

**未执行**：分支未 push、未合并 `release`、未发布任何包（发布工作流默认
`publish=false`，走 dry-run）。延后项见 §12。

## 附录 A：现状证据索引

| 问题 | 位置 |
| --- | --- |
| 版本不一致 | `Cargo.toml`、`package.json`、`packages/ffi-js/package.json` |
| 分支分叉 | tag `7.6.8` 与 `release@HEAD` 无祖先关系 |
| build.rs 写源码树 | `crates/proto/build.rs` |
| build 依赖 cmake | `crates/lang_unicodes/build.rs` + `opencc-rs` |
| 裸测试写盘 | `src/lib.rs` |
| 核心路径 panic | `src/pre_subset/mod.rs`、`src/run_subset.rs`、`src/loader.rs` |
| postinstall 下载 | `packages/ffi-js/package.json` → `dist/cli.js i default` |
| CI 手动触发 | `.github/workflows/*.yml` |
| CI 版本注入 | `.github/workflows/cross-build.yml` |
| 已归档 action | `actions-rs/toolchain`、`actions/create-release@v1` |

## 附录 B：环境记录

- 本机：macOS 26.5.1 / Node 24.21.0 / pnpm 12.6.0 / Rust 1.98.1 / Homebrew 7.0.13 / Docker 可用。
- 当前 `cargo check` 失败原因：缺 `cmake` 与 `protoc`；已确认通过 Homebrew 临时安装。
- npm 上实际 latest 版本未核实（网络检索工具不可用），以仓库内版本与实施时 registry 查询为准。
