# 8.0 依赖审计与外部 PR 处理记录

> 归档：2026-11-27 从 `docs/` 移入；内容为 8.0 计划期快照，不再随代码更新。

> 分支：`refactor/8.0`（PR #221）
> 基线提交：`af44ccd`
> 记录时间：2026-11-25
> 工具：pnpm 12.6.0 / Node 24.21.0

## 1. 审计结果对比

`pnpm audit --prod`：

| 时间点 | critical | high | moderate | low | 合计 |
| --- | --- | --- | --- | --- | --- |
| 处理前 | 1 | 13 | 5 | 1 | 20 |
| 处理后 | 0 | 0 | 0 | 0 | 0（`No known vulnerabilities found`） |

## 2. 处理明细

| 依赖 | 之前 | 现在 | 方式 | 位置 |
| --- | --- | --- | --- | --- |
| `seroval` | 1.5.4 | 1.8.2 | `overrides: seroval@<1.6.8` | `pnpm-workspace.yaml` |
| `@grpc/grpc-js` | 1.12.5 | 1.14.7 | 直接升级 `^1.14.0` | `packages/test`、`packages/ffi-js`（dev） |
| `brace-expansion` | 5.0.6 | 5.1.0 | `overrides: brace-expansion@>=4.0.0 <5.0.12` | `pnpm-workspace.yaml` |
| `source-map-js` | 1.2.1 | 1.2.4 | `overrides: source-map-js@<1.2.2` | `pnpm-workspace.yaml` |
| `protobufjs` | 7.6.2 | 7.6.6 | 直接升级 `^7.6.5` + `overrides: protobufjs@<7.6.5` | `packages/proto-to-cli`、`packages/ffi-js`、`packages/test` |
| `glob`（vite 插件） | 11.1.0 | 14.0.6 | 直接升级 `^14.0.2` | `packages/vite` |
| `minimatch`（vite 插件） | 10.2.5 | 11.0.9 | 直接升级 `^11.0.1` | `packages/vite` |
| `fontaine` | 0.6.0 | 0.7.0 | 直接升级 `^0.7.0` | `packages/metrics`、`packages/vite` |

`@grpc/proto-loader@0.8.1` 仍固定拉取 `protobufjs@7.6.2`，仅改自己的 `package.json`
无法覆盖这条传递依赖，因此追加 `protobufjs@<7.6.5` override。

`fontaine@0.7.0` 的 `types` 字段指向未随包发布的 `dist/index.d.ts`，只带
`index.d.mts` / `index.d.cts`；`packages/metrics` 的 `moduleResolution` 由 `node`
改为 `bundler` 才能解析到类型（`tsc` 报 TS7016）。运行时 API
（`readMetrics` / `generateFontFace`）签名不变。

glob / minimatch 的升级未回退：构建、扫描行为与视觉基线均通过（见 §4）。

## 3. 未处理的审计项

`pnpm audit`（含 devDependencies）仍有 20 项（3 critical / 6 high / 9 moderate / 2 low），
全部来自根项目开发工具链，不进入任何发布产物：

- `vitest@3.1.2` / `tinypool`（critical）：仅本地测试运行器，无对外暴露面。
- `postcss@8.5.15` / `vite@8.0.16`（high/moderate）：根 devDependency，仅用于本仓库构建；
  升级 `vite` 8.1.x 会牵动 `packages/*` 的构建配置，留待单独 PR。
- `browserslist` / `@babel/core` / `launch-editor`（high/low）：Babel 工具链传递依赖。
- 根 `devDependencies.glob@11.1.0` 已标记 deprecated（安装时有 WARN），
  该依赖在根脚本中未被直接使用，可按需清理。

`--prod` 口径（即发布产物依赖）已清零，上述项目按要求保留。

## 4. 验收记录

| 检查 | 结果 |
| --- | --- |
| `pnpm install` | 通过，lockfile 更新 |
| `pnpm build` | exit 0（含 metrics / vite / ffi-js） |
| `pnpm -C packages/vite build` | exit 0 |
| `pnpm -C packages/vite test` | **失败（既有问题，与本次改动无关）**，详见 §5 |
| `cargo build --release --locked -p ffi` | exit 0 |
| `node packages/test/visual/run.mjs` | 三组用例均 0.000% diff，exit 0 |
| `cargo test --locked` | 全绿（failure_paths 9 passed） |
| `cargo test --test failure_paths --locked` | 9 passed |
| `pnpm audit --prod` | `No known vulnerabilities found` |
| `node script/sync-version.mjs --check` | `all 8 package.json files are at 8.0.0` |

## 5. `packages/vite/test` 的既有失败

原始错误：

```
AssertionError [ERR_ASSERTION]: The expression evaluated to a falsy value:
  assert.ok(fs.existsSync('./node_modules/.vite/.subsets/9e0df19620e2ecada33853c8cb7caf1c/SmileySans-Oblique_ttf/reporter.json'))
```

判定与本次改动无关，理由：

1. 测试断言 `reporter.json`，而当前 `fontSplit({ reporter: true })` 产出的是
   `reporter.bin`（`BundlePlugin.createSourceCode` 读取的也是 `reporter.bin`）。
2. 测试硬编码的两个子集 hash（`9e0df196…`、`235d6d3f…`）与当前
   `example/subsets.html`、`example/subsets-1.html` 不匹配；按当前 HTML 重新计算的
   md5 分别为 `f017c0d7…` 与 `a0dcb32e…`，正是实际生成的目录名，说明 glob 14 /
   minimatch 11 的扫描行为正常。
3. 将 `packages/vite/src/subset/index.ts` 回退到 `af44ccd` 版本后重新构建并运行同一测试，
   报错位置与内容完全相同。

建议单独修复：断言改为 `reporter.bin`，并把 hash 改为由 example HTML 动态计算，
避免随示例内容漂移。

## 6. 外部 PR 处理建议

| PR | 结论 | 说明 |
| --- | --- | --- |
| #190 | 已移植 | `prebuild` 中 `...this.config` 移到末尾，用户配置可覆盖默认值（如 `silent` / `autoSubset` / `subsets`）。 |
| #205 | 已移植 | `fontaine` 升到 `^0.7.0`（`packages/metrics` + `packages/vite`）；附带 `metrics` 的 `moduleResolution: bundler`。可与 #205 一起合并或由本分支覆盖。 |
| #208 / #209 | 无需改动 | fs-extra 已解析到 11.4.1，`packages/vite` 的 glob 已到 14.0.6（根 devDependency 仍为 11.1.0，不进产物），两处 Snyk 修复已被覆盖，可在 PR 中留言关闭。 |
| #219 | 不适用 | 8.0 已删除 postinstall 与 `init.sh`，改为平台包解析；同时补齐了缺库错误信息中的平台行，现在会输出当前平台、已尝试路径与安装提示。 |

未对上述 PR 做任何关闭或评论操作，以上仅为本分支的处理结论。
