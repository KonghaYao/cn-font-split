# cn-font-split 8.0 npm 发布手册

> 状态：**已准备、未执行**。本手册只覆盖 npm；crates.io 与 PyPI 本轮不发布
> （用户决定）。发布动作全部由 `.github/workflows/release-cn-font-split.yml`
> 完成，手工命令只用于发布前检查与发布后验证。

## 1. 发布目标

8.0.0 **全部 npm 包一起发布**（用户决定）：8 个平台包 + 主包 + 其余 6 个包，共 15 个。
8 个平台包之间按 `dist-platforms/*` 的 glob 字母序发布，彼此无依赖；真正有硬顺序的
是「平台包 → 主包 → 其余 6 包」。下表按这个分组列出，前 8 行的编号只是清单序号。

| 序号 | 包 | 版本 | 说明 |
| --- | --- | --- | --- |
| 1 | `@cn-font-split/darwin-arm64` | 8.0.0 | `aarch64-apple-darwin` |
| 2 | `@cn-font-split/darwin-x64` | 8.0.0 | `x86_64-apple-darwin` |
| 3 | `@cn-font-split/win32-x64-msvc` | 8.0.0 | `x86_64-pc-windows-msvc` |
| 4 | `@cn-font-split/win32-arm64-msvc` | 8.0.0 | `aarch64-pc-windows-msvc` |
| 5 | `@cn-font-split/linux-x64-gnu` | 8.0.0 | `x86_64-unknown-linux-gnu` |
| 6 | `@cn-font-split/linux-arm64-gnu` | 8.0.0 | `aarch64-unknown-linux-gnu` |
| 7 | `@cn-font-split/wasm32-wasip1` | 8.0.0 | `wasm32-wasip1`（`wasm-opt -Oz`） |
| 8 | `@cn-font-split/wasm32-wasip2` | 8.0.0 | `wasm32-wasip2` |
| 9 | `cn-font-split` | 8.0.0 | 主包，`packages/ffi-js`，`optionalDependencies` 只指向 6 个原生平台包 |
| 10 | `cn-font-metrics` | 8.0.0 | `packages/metrics`，中文字体度量与跨平台 fallback CSS |
| 11 | `proto-to-cli` | 8.0.0 | `packages/proto-to-cli`，ffi-js 的代码生成依赖 |
| 12 | `cn-font-replacer` | 8.0.0 | `packages/font-replacer` |
| 13 | `font-sharp` | 8.0.0 | `packages/font-sharp` |
| 14 | `font-analyze` | 8.0.0 | `packages/font-analyze`，`files` 必须同时包含 `dist` 与 `data` |
| 15 | `vite-plugin-font` | 8.0.0 | `packages/vite`，依赖 `cn-font-metrics` 与 `cn-font-split` 的已发布版本，必须最后发 |

-   **只有 npm**：crates.io 与 PyPI 本轮不发布（用户决定）。
-   8 个平台包在 npm 上目前全部 404，这是**首次发布**。
-   线上 `cn-font-split` 的 latest 仍是 7.4.3；本次发布会把 latest 推到 8.0.0。
-   两个 wasm 包（`@cn-font-split/wasm32-wasip1` / `wasm32-wasip2`）独立发布，
    **不再**出现在主包 `optionalDependencies` 里、不随主包传递安装；主包安装只拉取
    当前平台的原生包，edge / WASI 用户需显式安装（见 `packages/ffi-js/README.md`）。

## 2. 前置检查

按顺序执行，任何一项不通过都不要开始发布。

### 2.1 npm 身份

```sh
npm whoami
```

输出的账号必须对 `@cn-font-split` scope 有写权限。

### 2.2 `NPM_TOKEN` 必须是 Automation 类型

classic token 分 `Publish` 与 `Automation` 两种。**发布机器人在 CI 里没有交互终端**：
如果账号开了 2FA 且 token 是 `Publish` 类型，`npm publish` 会因需要一次性密码而失败
（`npm ERR! code EOTP`）。

检查方式：

1. 登录 npmjs.com，从右上角头像菜单进入 **Access Tokens**，找到仓库里使用的那个 token；
2. 确认 Type 一栏是 **Automation**（不是 Publish）；
3. 核对它在 `gh secret list --repo KonghaYao/cn-font-split` 里的 `NPM_TOKEN`
   更新时间与你创建/轮换该 token 的时间一致（`npm token list` 能看到 token 后 4 位与
   创建时间，但 CLI 不显示类型，类型只能在网页上看）。

若使用 granular token：需要对 `@cn-font-split` scope 有 **Read and write** 权限，
并且允许「创建新包」（8 个平台包都是首次发布）。

### 2.3 `@cn-font-split` scope 是否存在、是否有写权限（本轮最大未知项）

8 个平台包全部 404，只能说明「没有可读的包」，无法区分「从没发布过」与
「scope 未建立 / 当前账号不是成员」。先在本地确认：

```sh
npm org ls cn-font-split            # 组织存在且当前账号是成员时列出成员与角色
npm access list packages @cn-font-split   # scope 下当前账号可见的包（空 scope 可能也报 404）
npm view @cn-font-split/darwin-arm64   # 预期 404，仅用于确认包确实不存在
```

-   如果 `npm org ls` 报 404：说明组织 `cn-font-split` 不存在（或账号不是成员）。
    需要先在 npmjs.com 创建组织并邀请账号，**或**换一个已有写权限的 scope。
    换 scope 会改变 8 个包名与主包的 `optionalDependencies`，属于代码改动，
    不能在发布时临时处理。
-   如果是账号个人 scope 计划：npm 只允许把**未使用的用户名**作为 scope。包名已经
    写死为 `@cn-font-split/*`，因此必须存在同名组织或用户，且当前账号有写权限。
-   以上命令都通过也不等于写权限一定可用；真正能证明的是第一次 `npm publish`。
    发布流程把平台包放在最前，失败会停在第一个平台包上，此时主包尚未发布，
    影响面最小。

### 2.4 仓库 secret

```sh
gh secret list --repo KonghaYao/cn-font-split
```

必须存在 `NPM_TOKEN`（且值就是 2.2 确认过的 Automation token）。需要更新时：

```sh
gh secret set NPM_TOKEN --repo KonghaYao/cn-font-split
```

### 2.5 版本与许可证

```sh
node script/sync-version.mjs --check
# 预期：all 8 package.json files + packages/ffi-py/setup.py are at 8.0.0 ...

node script/check-licenses.mjs
# 预期：all N publishable package(s) are Apache-2.0 with a LICENSE file
```

两者都只读文件、不需要安装依赖；在仓库任意分支检出下都能跑。
版本号唯一真源是根 `Cargo.toml` 的 `[workspace.package].version`。

## 3. 发布顺序

顺序是**硬约束**：`cn-font-split` 的 `optionalDependencies` 在安装时解析，主包先生效
而平台包缺失时，用户会装到一个跑不起来的包（`src/load.ts` 抛「找不到可用的动态库」）。
此外 npm 的读路径有复制/缓存延迟，所以 workflow 在两次发布之间还有一个「等待平台包
可见」的门禁。

> 本手册假定包含本次发布的提交已合并到 `release`（`gh workflow run --ref release`
> 读取的是远端 `release` 上的 workflow 文件）；若在合并前操作，请把 `--ref` 换成实际
> 分支，否则会跑旧流程。

### 3.1 触发 cross-build（只构建，不发布）

```sh
gh workflow run cross-build.yml --ref release \
  -f dry_run=true -f create_release=false

gh run list --workflow=cross-build.yml --limit 5
gh run watch <run-id> --exit-status
```

需要 10 个作业全绿：8 个 `bindings-<triple>`（其中 riscv64 / s390x 不进 npm）
+ 2 个 `bindings-wasm32-wasip*`。产物 `libffi-<triple>.<ext>` 保留 14 天。

记下 **run id**，下面两步都要用，而且必须来自**同一个 commit**：
`release-cn-font-split.yml` 用 `github.sha`（被派发 ref 的提交）自动查找产物，
所以中间不要再往 `release` 合新提交，否则要重跑 cross-build。

workflow 会读取 `cross_build_run_id` 指向运行所在提交的 `head_sha`，并校验它必须等于
本次发布 commit（`GITHUB_SHA`），不匹配直接失败——人工填了别处运行的 run id 也会被拦下。

### 3.2 dry-run（`publish=false`，必须全绿）

```sh
gh workflow run release-cn-font-split.yml --ref release \
  -f publish=false -f cross_build_run_id=<run-id>
```

dry-run 不再只是 `pnpm pack --dry-run`：它会真实下载 `bindings-*`、生成 8 个
`dist-platforms/<platform>/`，并校验目录存在、`package.json` 的 `name` /
`version`、每个目录存在 `LICENSE`、以及每个二进制 > 64KB。此外还会 `pnpm build`
构建全部 npm 包并执行 `node ./script/check-publishable.mjs`（清单 `files` /
入口文件 / 无 `prepublish` / `font-analyze` 的 `data`）。任何一项失败都不要进入 3.3。

### 3.3 正式发布（`publish=true`）

```sh
gh workflow run release-cn-font-split.yml --ref release \
  -f publish=true -f cross_build_run_id=<run-id>
```

workflow 内部顺序：

1. 发布 8 个平台包：`pnpm publish dist-platforms/<p> --access public --no-git-checks`；
2. 等待 8 个 `@cn-font-split/<p>@8.0.0` 在 `registry.npmjs.org` 可见
   （每个最多 12 次、间隔 5s，仍不可见则失败且**不**发布主包）；
3. 发布主包：`pnpm -C packages/ffi-js publish --access public --no-git-checks`；
4. 主包之后依次发布其余 6 个包，顺序固定：
   `packages/metrics`（`cn-font-metrics`）→ `packages/proto-to-cli` →
   `packages/font-replacer` → `packages/font-sharp` → `packages/font-analyze` →
   `packages/vite`（`vite-plugin-font`）。**vite-plugin-font 必须最后**：它依赖
   `cn-font-metrics` 与 `cn-font-split` 的已发布版本，`pnpm publish` 会把
   `workspace:^` 改写成实际版本号，依赖未上线时发出会导致用户安装失败。
   `proto-to-cli` 排在前面是因为 ffi-js 的代码生成用它，保持与构建顺序一致；
5. 发布后可见性总检查：15 个包（8 平台 + 主包 + 6 其余）逐个
   `npm view "<pkg>@<version>" version`，每个最多 12 次、间隔 5s，全部可见才成功。

`concurrency` 固定为 `release-cn-font-split-${{ github.ref }}` 且不取消进行中的运行，
两次派发不会交错。

## 4. 发布后验证

### 4.1 15 个包都能读到 8.0.0

```sh
for p in \
  @cn-font-split/darwin-arm64 @cn-font-split/darwin-x64 \
  @cn-font-split/win32-x64-msvc @cn-font-split/win32-arm64-msvc \
  @cn-font-split/linux-x64-gnu @cn-font-split/linux-arm64-gnu \
  @cn-font-split/wasm32-wasip1 @cn-font-split/wasm32-wasip2 \
  cn-font-split cn-font-metrics proto-to-cli cn-font-replacer \
  font-sharp font-analyze vite-plugin-font; do
  printf '%-40s ' "$p"
  npm view "$p@8.0.0" version --registry https://registry.npmjs.org/ || echo MISSING
done
```

### 4.2 空目录真实安装 + 真实切分

```sh
rm -rf /tmp/cfs-8.0-smoke && mkdir -p /tmp/cfs-8.0-smoke && cd /tmp/cfs-8.0-smoke
npm init -y
npm i cn-font-split@8.0.0 --prefer-online
```

用仓库里的测试字体跑一次真实切分（字体路径按本机实际位置替换）：

```sh
node --input-type=module -e '
import fs from "node:fs";
import { fontSplit } from "cn-font-split";

const input = fs.readFileSync("/Users/kk/code/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf");
await fontSplit({
    input: new Uint8Array(input),
    outDir: "./out",
    testHtml: false,
    reporter: false,
});
const files = fs.readdirSync("./out").filter((name) => name.endsWith(".woff2"));
console.log("woff2 chunks:", files.length);
if (files.length === 0) process.exit(1);
'
```

预期：TTF 输入默认配置约 47 个包（与 `bench-results/v8-perf/bench.md` 的
`SmileySans-Oblique.ttf` + `default` 行一致；59 → 63 是 `.ttf.woff2` 输入的
v7 → v8 对比）。只要不抛错、确实写出 woff2 即视为通过。

### 4.3 平台包二进制确实存在

```sh
ls -l node_modules/@cn-font-split/darwin-arm64/libffi-*.dylib
# Linux: ls -l node_modules/@cn-font-split/linux-x64-gnu/libffi-*.so
# Windows: dir node_modules\@cn-font-split\win32-x64-msvc\libffi-*.dll
```

未做冒烟检查的风险面：本机没有 macOS x64 / Windows / Linux 环境时，只能靠
`npm view` 与 workflow 的下载/大小门禁证明；必要时用对应平台的机器或 CI 补一次
`node_modules/@cn-font-split/<p>/libffi-*` 存在性检查。

## 5. 回滚

npm 的版本删除窗口很短：

-   **72 小时内**：通常可 `npm unpublish cn-font-split@8.0.0`、
    `npm unpublish @cn-font-split/darwin-arm64@8.0.0`（逐个平台包）；若该版本已被
    其它包依赖或 registry 拒绝，则只能 `npm deprecate` 并尽快发修复版。撤回顺序与
    发布相反：先撤主包，再撤平台包。
-   **超过 72 小时**：不能再删版本，只能 `npm deprecate` 标记，并尽快发布修复版本。
    `npm deprecate cn-font-split@8.0.0 "原因"` 会让 `npm i` 打印警告，但不会阻止安装。
-   **主包已发布、平台包缺失**：正确做法是补齐缺失的平台包：先对 8 个包逐个
    `npm view @cn-font-split/<p>@<version> version` 确认哪些缺失，只手工发布缺失的
    那些（`npm publish dist-platforms/<p> --access public`）；不要整体重跑 workflow，
    它会在已发布的包上失败。**不要撤回主包**——撤回会让声明了
    `cn-font-split@8.0.0` 的项目无法重新安装（只能退回 7.x）。
-   8.0 与 7.x 的产物指纹算法不同，回滚到 7.x 时不要混用两代产物与缓存键。

## 6. 已知风险 / 剩余限制

1.  **生命周期脚本已统一为 `prepack`**：`packages/metrics`、`packages/proto-to-cli`、
    `packages/font-analyze` 原先用 `prepublish`（`npm pack` / `npm publish` 不执行它，
    会发出空 `dist`），现已全部改成 `prepack`；`node ./script/check-publishable.mjs`
    会断言不再出现 `scripts.prepublish`，该检查在 CI 与发布 workflow 的 dry-run 路径
    都会执行。
2.  **wasm 平台包不随主包安装（已决定）**：`@cn-font-split/wasm32-wasip1` /
    `@cn-font-split/wasm32-wasip2` 仍照常发布，但已从主包 `optionalDependencies`
    移除；主包安装只会拉取当前平台的原生包，桌面用户不再多装两个 wasm 包。
    edge / WASI 用户需显式安装（见 `packages/ffi-js/README.md` 的 WASM 一节）：
    `npm i @cn-font-split/wasm32-wasip1` 或 `npm i @cn-font-split/wasm32-wasip2`。
    `.github/workflows/test-cross-use.yml` 的 wasm 作业已改为先显式安装
    `@cn-font-split/wasm32-wasip1@8.0.0` 再跑测试。`src/load.ts` 的
    `getPlatformPackageName()` 从不解析 wasm 包，`matchPlatform()` 只是把不支持的
    平台映射成 `wasm32-wasip1` 这个 triple 用于报错，因此移除不影响解析逻辑。
3.  **产物保留期**：cross-build 的 artifacts 只有 14 天。超过后必须重跑 cross-build
    才能再次发布；`cross_build_run_id` 与 `release-cn-font-split` 必须在同一 commit。
4.  **cross-build 首次实跑结果（2026-11-27，run `45923211383`，ref `release` @ `9baf900`）**：
    Linux×4（x86_64 / aarch64 / riscv64 / s390x）、Windows×2、WASM `wasm32-wasip1`
    共 7 个 job 成功。两个失败已定位并修复，**尚未重跑验证**：
    -   `macOS-aarch64` / `macOS-x86_64` 启动即被取消，注解为
        `The configuration 'macos-14-arm64-us-default' is not supported`——本仓库不可用
        `macos-14`，已改用 `macos-latest`（与 CI 视觉回归作业一致，实测可用）；x86_64 仍在
        arm64 runner 上交叉编译，`target` 与构建命令不变。
    -   `wasm32-wasip2` 编译失败，报 `linking with wasm-component-ld failed` /
        `failed to resolve import 'env::__cxa_allocate_exception'`：依赖 `harfbuzz_rs_now`
        的 `build.rs` 用 `cc` 以 C++ 编译 `harfbuzz-output.cc` 且未关闭异常，wasip2 的组件
        链接器无法把 `__cxa_*` 映射进 WASI world（wasip1 不经过组件编码器，不受影响）。
        现仅在 wasip2 构建时导出 `CXXFLAGS="-fno-exceptions"`，效果需重跑确认。
5.  **仓库无 CHANGELOG、无 8.0 tag**；`arch_hashcheck` 的两个测试是 `#[ignore]`，
    不在 CI 内。发布说明需要手工整理。
6.  **`@cn-font-split` scope 写权限**未在发布前被证明（见 2.3），这是本轮最大的
    单点风险。
7.  **根目录 `publish-all.sh` 是 crates.io 发布脚本**：默认只做
    `cargo publish --dry-run`，传 `--publish` 会对 `crates/*` 逐个真实
    `cargo publish`。本轮 crates.io 不是发布目标，发版当天不要运行它；npm 发布只走
    本手册/workflow。
8.  **`font-analyze` 在 Node 原生 ESM 下无法 `import`（既有问题，本轮不修）**：
    `font-analyze` 依赖 `@konghayao/opentype.js`（`^2023.11.20`），该依赖的
    `package.json` 把 `main` 写成绝对路径 `/dist/opentype.module.js`。Node 22/24 的
    原生 ESM 直接按 `main` 解析，`import { FontAnalyze } from 'font-analyze'` 会报
    `ERR_MODULE_NOT_FOUND: Cannot find package '/dist/opentype.module.js'`；该依赖的
    `module` 字段是正确的，所以 Vite / webpack 等打包器可用。问题自线上
    `font-analyze@1.4.2` 起就存在，依赖最新版 `2024.5.25` 的 `main` 也未修正，无法靠
    升级依赖解决；8.0.0 照旧发布，建议在 release notes 注明「Node 原生 ESM 暂不可用」
    （见 `packages/font-analyze/README.md`）。
