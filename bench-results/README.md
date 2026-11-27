# 性能基准结果

本目录保存 8.0 开发期与端到端场景的基准数据。每个子目录都含 `bench.md`（可读摘要：环境、提交、结果表）与 `bench.json`（机器可读的同一份数据）。

## 子目录

| 目录 | 提交 | 说明 |
| --- | --- | --- |
| [v7-baseline](./v7-baseline/) | `1650af1` | 8.0 开发起点（7.x 基线）在 macos-aarch64 上的基准。 |
| [v8-pre-perf](./v8-pre-perf/) | `ea9255e` | 8.0 性能优化**前**的基准，作为 v8-perf 的对照。 |
| [v8-perf](./v8-perf/) | `d6e5d2b` | 8.0 性能优化**后**的基准。 |
| [v8-deps](./v8-deps/) | `99e4cc9` | 8.0 开发期基准，结果与 v7-baseline 接近；目录名指向依赖更新阶段，仓库内无进一步说明。 |
| [e2e-v8](./e2e-v8/) | `c2ca413` | 端到端基准：含真实写盘（node v24.21.0，darwin-arm64）。 |

`v7-baseline`、`v8-pre-perf`、`v8-perf`、`v8-deps` 均由 8.0 开发期脚本生成，脚本未入库。

`e2e-v8` 的生成脚本是 [`packages/ffi-js/scripts/bench-e2e.mjs`](../packages/ffi-js/scripts/bench-e2e.mjs)。

## 关键结论

`v8-perf` 相对 `v8-pre-perf`：总耗时 −61.2%，woff2 总字节 −0.25%，分包数 −2.7%。口径与分用例明细见 [8.0 重构计划与验收](../docs/REFACTOR-8.0.md) 的性能一节。
