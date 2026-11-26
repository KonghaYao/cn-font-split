# 8.0 延后项跟进计划

> 来源：`docs/REFACTOR-8.0.md` §12。以下方案由只读调研产出，按「无产物变化的本地重构 → 设计类 → 算法」排序。

## 状态

| 项目 | 状态 |
| --- | --- |
| 许可证统一 | 已完成（49792af + c2ca413） |
| `packages/server` 排除 | 已完成（ceb96ca） |
| `name_template` 解析器 | 已完成（1e98a02） |
| plugin trait | 已完成（3d83540） |
| Config builder | 已完成（f42098f） |
| 端到端 benchmark | 已完成（5c321e8） |
| CSS AST / Context 拆分 / 实测体积分包 | CSS AST、Context 拆分：已完成（批次 3）；实测体积分包待排期（按本文顺序） |
| woff / prost / wasm / cross-build / Linux 像素基线 / Feature 矩阵 | 依赖决策或远端环境 |

批次 1–2 已随 PR #221 合入 `release`（合并 commit `b3d8b03`）。

## A. 核心架构

约束：MSRV 1.85、`harfbuzz_rs_now 2.3.2`、`woff 0.4.0` 均不动；所有改动须保持产物逐字节等价（除非该项明确改变分包）。

### 1. Context 拆分与阶段产物

**现状**：`src/runner.rs:14` 单个 `Context<'a,'b,'c>`（9 字段）被三段共用 `&mut face`/`&mut reporter`/`callback`；CSS 层（`output_css.rs:104` 等）也直接吃它，且经 `pub mod runner` 对外暴露。

**方案**：`FontSource<'a>{binary:&'a [u8], face:Owned<Face<'a>>}`；`PreSubsetOutput{subsets:Vec<Vec<u32>>, name_table, fvar, languages}`；`RunSubsetOutput{items:Vec<RunSubsetResult>, bundle:BundleMessage}`；`LinkSubsetOutput{css:String, extra_files:Vec<(String,Vec<u8>)>}`。签名改为 `pre_subset(&mut FontSource,&Config)->Result<PreSubsetOutput>`、`run_subset(&FontSource,&Config,&Pre)->Result<Run>`、`link_subset(&Config,&Pre,&Run)->Result<Link>`。emit、`OutputReport` 组装、`version/platform` 上移到 `font_split_inner`；`gen_svg_from_ctx` 改为返回 `extra_files`。

**涉及**：`src/runner.rs`、`pre_subset/mod.rs:61`、`run_subset.rs:46`、`link_subset/mod.rs:14`、`pre_subset/gen_svg.rs:19`。

**风险**：事件顺序（woff2 → css → html → proto）与 `output_css.rs:117` 的 `.rev()`；svg 目前在 pre 阶段 emit；`create_context` 在 3 个文件共有 14 处调用（13 处在测试）。

**验证**：33 单测、`tests/failure_paths.rs` 9 项、视觉 3×0.000%、bench 每包 hash 集合逐一相同。

**可立即实施**：可以。第一步只引入类型、保留签名（可单 commit 回滚），第二步再纯函数化。

**待决策**：是否保留 `runner::Context` 兼容别名（8.0 已 breaking，建议删除并在 MIGRATION 记录）。

**结论**：按建议删除兼容别名，迁移说明见 `docs/MIGRATION-8.0.md` §4「管线内部 API」；实现时 `PreSubsetOutput` 多带一个 `extra_files` 字段承载 preview SVG，`RunSubsetOutput` 多带 `files` / `details` 两个字段承载待输出字节与 `subset_detail` 明细。

### 2. plugin trait 与显式顺序表

**现状**：`pre_subset/mod.rs:98` 的 `Vec<fn(&mut Vec<IndexSet<u32>>,&mut BTreeSet<u32>,&mut PreSubsetContext)->Result<()>>`，启用条件在 105–121 行内联 `unwrap_or`。

**方案**：`trait PreSubsetPlugin{fn name(&self)->&'static str; fn enabled(&self,&Config)->bool; fn apply(&self,&mut SubsetDraft)->Result<()>}`，零尺寸 unit struct 实现 + `static PIPELINE:&[&dyn PreSubsetPlugin]=&[&AddUserSubset,&LanguageArea,&AddRemainChars,&AutoSubset,&FontFeatures,&ReduceMin]`；`SubsetDraft{subsets,remaining,ctx}` 聚合三个可变参数。注释固化顺序约束：`add_user` 必须首个（要 `remaining.remove`）、`add_remain` 在 `auto_subset` 前、`features` 在 `auto_subset` 后（`features.rs:30` 会把字符并回首个相交包，体积会再变）。

**涉及**：`pre_subset/{mod,plugin,plugin_add_user_subset,plugin_auto_subset,features}.rs`。

**风险**：顺序错就改变产物；启用默认值必须交给 Config（见 5）以免两处真相。

**验证**：新增断言 `PIPELINE` 名称快照；`RUST_LOG=info` 输出不变；bench hash 不变。

**可立即实施**：可以（纯重构）。

### 3. CSS 结构化 / AST

**现状**：`output_css.rs:63` 用 `format!` 拼 `@font-face`，`compress` 靠 `replace("\n","")`（96 行）；`header_comment.rs:5`、`font_weight.rs` 各自拼串。

**方案**：新增 `src/link_subset/css/ast.rs`：`enum SrcItem{Local(String),Url{url,format}}`、`struct FontFace{family,src,style,display,weight,unicode_range:Vec<u32>}`、`enum CssNode{Comment,FontFace}`、`struct Stylesheet{header:String,nodes:Vec<CssNode>}` + `render(compress,indent)`；`UnicodeRange::stringify` 保留。必须逐字节复刻现有怪癖：主 `url(...)` 与 `format("woff2")` 之间无空格、polyfill 有空格、压缩模式删 `\n` 但保留 header 换行、非压缩 4 空格缩进且闭合 `}` 顶格、`comment_unicodes` 前置。

**涉及**：`link_subset/output_css.rs`、`link_subset/css/{mod,header_comment,font_weight}.rs`、新增 `css/ast.rs`。

**风险**：任何空格差异都会打爆 `packages/test/visual/out/*/result.css`；header 含 `Utc::now()` 不可复现，建议先把 header 处理成独立节点，只结构化 face 规则。

**验证**：golden 测试固定 render 字符串；对三组 demo 跑 `font_split` 与现有 `result.css` 比对（掩掉 `CreateTime`）；视觉三组 0.000%。

**可立即实施**：可以，无依赖/版本变更。

### 4. 按实测体积迭代分包（WorkSans 157,996B）

**现状**：`plugin_auto_subset.rs:95 chars_for_target` 用两点采样 + 幂律外推估每字符字节，`split_vector:243` 只按字符数切；`features_plugin` 随后又搬字符。实测 `packages/test/visual/out/vf/result.css` 末条 `@font-face` 即 157,996B：Latin 剩余包约 210 字符，gvar 每字形开销高，而估算按全字体均值（~285 B/char）判为无需再切；`chunk_size_tolerance` 未接线。

**方案**：在 `run_subset.rs` 加 `split_by_size`，以上限 `limit=chunk_size*(1+tolerance)` 进行测量驱动切分：对根包有序字符 vec 中点二分（保持 unicode-range 连续、顺序确定，DFS 左→右），**接受准则**：子包字节和 ≤ 父包×(1+ε) 才保留，否则回退父包（避免 overhead 主导包被切碎）；缓存已测节点；额外压缩次数上限（如基线 1.5×）与 `max_allow_subsets_count` 作为预算硬顶。估算阶段保留（提供拓扑与首轮切分），测量阶段负责收敛。

**涉及**：`src/run_subset.rs`（新 `split_by_size`、`build_single_subset` 复用）、`pre_subset/plugin_auto_subset.rs`、`src/config.rs`（新）。

**风险**：CJK 包数 +10~25%（§11 A 组：223/301/149 → 271/372/175），与「包数 ≤+5%」约束冲突；总字节可能 +1~2%；每个切分多一次父包压缩（耗时）；切分后浏览器按需下载粒度变细。

**验证**：bench 增断言 `max ≤ limit`（CJK/Smiley）+ 总字节 ≤+1%；WorkSans 157,996 → 约 45KB 且包数 ≤12；`max_allow_subsets_count` 命中路径；总耗时回退 ≤5%。

**可立即实施**：否，需先定语义（见决策）。

**待决策**：①`chunk_size_tolerance` 是比例（文档 §11）还是绝对字节（`packages/ffi-js/README.md:139` 写 `1*1024`）；②允许的包数增幅（0/5%/10%）；③达不到上限时报错、告警还是接受。

### 5. Rust Config builder / 单一配置源

**现状**：默认值散落 6 处文件、12 个 `unwrap_or`（`pre_subset/mod.rs:87,106-119`、`runner.rs:134`、`output_css.rs:19,29,80,91,96,109`、`link_subset/mod.rs:19,23`、`header_comment.rs:11,20`）；`main.rs:146` 直接拼 `InputTemplate`；TS 侧纯透传 proto，无第二份默认值。

**方案**：新增 `src/config.rs`：`struct Config`（已解析/已校验，含 `BuildMode`、`tolerance`、`multi_threads`）+ `Config::from_template(&InputTemplate)->Result<Config>`（把 `runner.rs:59 validate_config` 迁入，错误 variant 不变）+ `to_template()`；`font_split` 改为 `from_template` 后走 pipeline；CLI 由 `Config` 生成 `InputTemplate`；新增 `docs/CONFIG.md` 默认值表与 `tests/config_defaults.rs` 一致性测试；proto 明确降级为 wire IR。

**涉及**：新增 `src/config.rs`、`src/runner.rs`、`src/main.rs`、`src/lib.rs`。

**风险**：默认值搬错即产物变化；`chunk_size` 0 的错误码不可变。

**验证**：`failure_paths` 5 项配置错误 variant 不变；bench 逐字节相同；默认值表测试。

**可立即实施**：可以（先只搬默认值与校验，不改任何语义）。

**待决策**：`docs/CONFIG.md` 是否作为对外契约（会限制以后改默认值）。

### 6. name_template 手写解析器

**现状**：`name_template.rs:22`，第 52 行每条模板调用 `Regex::new(...).unwrap()`（未缓存），69 行再编译一次；`\w` 为 Unicode 语义；支持 `[\ext\]` 转义；`regex` 全仓库仅此一处使用（可整包移除）。

**方案**：单遍扫描：遇 `[` 找下一个 `]`，内部若以 `\` 包裹则原样输出 `[tag]`，否则按 `name[:arg]` 拆分；`is_word(c)=c.is_alphanumeric()||c=='_'`；tag 收敛为枚举 `Hash{len}|Blake3{len}|Md5{len}|Ext|Index`，未知 tag 原样保留；长度仍 `chars().take(n)`。从 `Cargo.toml` 删 `regex`，`Cargo.lock` 收敛（MSRV 不变）。

**涉及**：`src/link_subset/name_template.rs`、`Cargo.toml`。

**风险**：未闭合 `[`、`[a:b:c]`、嵌套括号的边界行为；`\w` 与 `is_alphanumeric` 对组合符（Mn）有差异——建议只支持闭集 tag，超集输入原样返回，差异需在文档写明。

**验证**：保留现有 10 个测试；把旧 regex 实现留在 `#[cfg(test)]` 做差分/随机语料（≥500 例）比对，再删 regex；bench/视觉文件名逐项一致。

**可立即实施**：可以。

### 7. 四个字段的语义或显式拒绝

**现状**：`chunk_size_tolerance`（proto float，`main.rs:40`）、`max_allow_subsets_count`（只被 `validate_config` 校验 >0）、`build_mode`（proto 标 `TODO`，无人读取）、`multi_threads`（`run_subset.rs:53` 恒 `par_iter`）均未参与计算。

**方案**：`multi_threads=false` → `run_subset` 抽 `build_one(index,&[u32])`，在 `par_iter`/顺序 `for` 间切换（默认 true，对 wasm/单线程宿主有意义）；`chunk_size_tolerance` 作为第 4 项 limit 因子，未落地前非 0 值返回 `InvalidConfig`（沉默忽略更危险）；`max_allow_subsets_count` 在预测阶段上调 `chars_per_subset` 使预计包数达标，4 落地后兼作切分预算，最终仍超则 `InvalidConfig`；`build_mode` 收为枚举，仅接受 `None|"default"`，其他值 `InvalidConfig`，同步改 proto/CLI 注释与 README。

**涉及**：`src/config.rs`、`src/runner.rs:59`、`src/run_subset.rs`、`src/main.rs`、`crates/proto/src/index.proto`、`packages/ffi-js/README.md`。

**风险**：拒绝会打断现有传参调用方（TS 类型仍允许）→ 必须写进 `docs/MIGRATION-8.0.md`；`multi_threads=false` 明显变慢但结果须一致。

**验证**：新增 failure_paths 用例（`tolerance=0.1`、`build_mode="x"` 返回 `InvalidConfig`）；`multi_threads` true/false 的 hash 集合相同；`max_allow_subsets_count` 边界用例。

**可立即实施**：`multi_threads` 与显式拒绝可以；`tolerance`/`max` 完整语义依赖第 4 项。

**待决策**：拒绝 vs 静默兼容；`build_mode` 是否保留为将来预设开关。

### 建议顺序

6 → 2 → 5（都是无产物变化的本地重构，互不依赖）→ 3 → 1 → 7 的 `multi_threads` → 4（依赖 7 的 tolerance 决策）→ 7 其余。

### Critical Files for Implementation

- src/runner.rs
- src/run_subset.rs
- src/pre_subset/mod.rs
- src/link_subset/output_css.rs
- src/link_subset/name_template.rs

## 附：计划来源与关键证据
计划文件：`/Users/kk/code/cn-font-split/.peri/plans/refactor-8.0-arch-deferred.md`（未修改任何源码，未执行 git 写操作）

关键证据：`docs/REFACTOR-8.0.md` §12 遗留表与 §11 数据；`src/runner.rs:14/59/110`、`src/pre_subset/mod.rs:98`、`src/run_subset.rs:46/53`、`src/link_subset/output_css.rs:63/104/117`、`src/link_subset/name_template.rs:52/69`、`src/pre_subset/plugin_auto_subset.rs:95/243`、`src/pre_subset/features.rs:30`；`bench-results/v8-perf/bench.md`（WorkSans 9 包，min/median/max=1780/4544/157996）；`packages/test/visual/out/vf/result.css` 末条 `@font-face` 证实 157,996B 包是 Latin 剩余包（约 210 字符）；`packages/ffi-js/README.md:139` 的 tolerance 语义与文档 §11 冲突。

## C. JS 与分发

只读调研，未修改文件，也未执行 git 写操作。

### 1) google-protobuf → @bufbuild/protobuf
**现状**：`packages/ffi-js/package.json:52` 依赖 google-protobuf；`src/gen/index.ts`（2285 行）以及 createAPI、interface、decodeReporter、wasm 都在使用这套 API；`check` 用的 test 只在清单里声明、源码零引用；`gen/proto.ts` 由 proto-to-cli 生成，不受影响。  
**方案**：把 `@bufbuild/protobuf` 与 `@bufbuild/protoc-gen-es` 锁定到同一版本 2.17；用 `protoc --es_out`（target=ts）替代 protoc-gen-ts；把 `fromObject`、`serialize`、`deserialize` 换成 `create`、`toBinary`、`fromBinary`；`OriginInput` 改为 `MessageInitShape`、`FontReporter` 改为 `OutputReport`；transType 显式做字段白名单；删除未导出、未打包的 `services.ts`。  
**文件**：`packages/ffi-js/package.json`、`src/gen/index.ts`、`src/createAPI.ts`、`src/interface.ts`、`scripts/build_proto_ts.sh`、`packages/test/package.json`。  
**风险**：生成环节需要 protoc 才能运行；公开的 d.ts 会被破坏（performance 中的 `proto.OutputReport.SubsetDetail`）；optional 字段与未知字段的语义存在差异；如不可行，可回退到 protobufjs。**验证**：新旧实现使用同一配置做序列化对比、解码真实的 `reporter.bin`、运行 smoke-node/error、wasm 冒烟、`pnpm build`、WebKit 三组视觉比对。

### 2) Bun 与 Deno 的 optionalDependencies 平台包解析
**现状**：`src/bun/index.ts`、`src/deno/index.ts` 只读取 `CN_FONT_SPLIT_BIN` 或 `dist/libffi-*`；发布包 `files:["dist"]` 不含该库，安装后运行时解析必然失败；Node 已有完整解析（`src/node/index.ts:30-68`）。  
**方案**：把 `resolveBinPath` 抽到 `load.ts`：先查 env，再 `createRequire(import.meta.url).resolve('@cn-font-split/<key>')`，然后本地回退，最后给出列出尝试项的报错；Bun/Deno 复用。实测 Deno 2.9.7 中 `createRequire` 可解析 node_modules；`import.meta.resolve` 对 optionalDependencies 中的平台包仍报 `not a dependency`，不可用。  
**文件**：`src/load.ts`、`src/{node,bun,deno}/index.ts`、`src/load.test.ts`、`README.md`。  
**风险**：Deno 是否自动安装 optionalDependencies 仍待验证；`npm:` 远程导入无 node_modules 时只能靠 env；Deno 需 `--allow-ffi/read/env`。**验证**：单测覆盖命中/缺失/回退/报错；Bun/Deno 临时项目安装主包+平台包 tarball 实跑；env 覆盖。

### 3) packages/server 独立 workspace（收编或显式排除）
**现状**：`packages/server/Cargo.toml` 锁 crates.io `cn-font-split 7.4.0`、`cn-font-proto 0.1.2`、`cn-font-utils 0.2.0`，自带 `[workspace]` 与独立 `Cargo.lock`；根 `members` 不含它；Docker 用 rust 1.84，低于 MSRV 1.85。  
**方案**：推荐显式排除——根 `[workspace]` 加 `exclude=["packages/server"]` 并注明“独立服务”，8.x 再收编。收编需删 server 的 workspace/lock、加 member、三依赖改 path、Docker 升 1.85 且 context 改仓库根并加 `.dockerignore`。  
**文件**：`Cargo.toml`、`packages/server/Cargo.toml`、`Dockerfile`、`release-cn-font-server.yml`。  
**风险**：排除后继续停在 7.4.0，与主线 API 漂移；收编会使 workspace 构建/clippy 范围与时间增大、Docker 缓存失效。**验证**：`cargo metadata --no-deps` 不含 server、workspace build/fmt/clippy 不变、`docker build packages/server` 通过；若收编则 `cargo check -p server` + 镜像 `/upload` 冒烟。

### 4) 端到端（含写盘）benchmark
**现状**：`examples/bench.rs` 只统计内存回调；`docs/REFACTOR-8.0.md:253` 仅有一次手工记录：Node 含 223 文件写盘 713ms vs 内存 274ms。  
**方案**：新增 `packages/ffi-js/scripts/bench-e2e.mjs`，固定 NotoSerifSC default 与 chunk-48k、5 轮中位数（1 轮预热丢弃）；每轮跑内存 sink（`outputFile: async()=>{}`）与真实 fs 写盘两模式，记录 compute/write/total、文件数与字节，输出 `bench-results/e2e-<label>/{json,md}`；根加 `bench:e2e`。可选给 bench.rs 加 `--disk`。  
**文件**：`examples/bench.rs`（可选）、`packages/ffi-js/scripts/bench-e2e.mjs`、`package.json`、`bench-results`。  
**风险**：FS 缓存/杀毒噪声；CI 不稳定，默认不进 CI 或只跑 1 轮 smoke；需清理临时目录。**验证**：两模式文件数/字节一致、disk>memory、与 713ms 同量级、JSON/MD 可复跑。

### 5) 许可证统一
**现状**：根为 Apache-2.0；`metrics`/`font-analyze`/`performance` 为 ISC；`font-replacer` 为 MIT；`proto-to-cli` 的 license 字段是作者串。  
**核实**：npm `cn-font-replacer@1.0.0` tarball 内 LICENSE 已是 Apache-2.0（manifest 仍 MIT），author/repo 均为 KonghaYao、源码无第三方版权头 → 未发现第三方派生证据，MIT 属历史遗留；变更前请作者确认。  
**方案**：7 个发布包统一 `license=Apache-2.0` 并各放 LICENSE（自根复制）；font-replacer 同步 README/CHANGELOG；proto-to-cli 修 license、author 填 KonghaYao；performance 同步；新增 `check-licenses.mjs`。  
**文件**：`packages/*/package.json`、`packages/*/LICENSE`、`packages/font-replacer/README.md`、`script/sync-version.mjs`。  
**风险**：已发布 MIT 版本不可撤销（仅影响新版本）；若发现第三方代码需保留 MIT+NOTICE；旧 tarball 仍显示 MIT。**验证**：许可证脚本对发布包全绿、`npm pack --dry-run` 含 LICENSE、`sync-version:check` 不变。

### 6) packages/test 与 packages/performance 的定位
**现状**：`test` 为 private/0.0.0，根 build 显式排除，`visual/` 已是 CI 稳定基线；但 README 仍写 subsets/downloadFonts，FeatureConfig 与远程字体脚本残留。`performance` 为 private、无 build/test、仅 Bun 引用 `cn-font-split/dist/bun`，docs:61 称已由新 harness 取代。  
**方案**：`test` 定位“验收台/演示”：`visual/` 作为唯一 CI 门禁，补 `test:visual`/`test:feature`，重写 README，远程字体用例标 manual 并移出默认流程。`performance` 定位“内部研究”：README 标 experimental/Bun-only/不发布，保留 `bun ./src/sweet_point.ts`，不收编主构建。  
**文件**：`packages/test/README.md`、`packages/test/package.json`、`packages/test/script/*`、`packages/performance/README.md`、`packages/performance/package.json`。  
**风险**：改名/迁移牵动 CI；Bun-only 限制易被误用。**验证**：`pnpm -r ls --depth -1` 包清单、`pnpm build` 仍只构建发布包、CI 仅跑 visual、`sync-version:check` 不含私有包。

### Critical Files for Implementation
- packages/ffi-js/src/gen/index.ts
- packages/ffi-js/src/createAPI.ts
- packages/ffi-js/src/load.ts
- examples/bench.rs
- packages/server/Cargo.toml
