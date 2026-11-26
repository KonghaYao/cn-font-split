# cn-font-server

字体构建服务器，使用 axum 库进行编写，高效构建并部署字体，面向服务集成，不直接对外。

> **状态：8.0 冻结（frozen）**
> 本包不参与 8.0 的构建/发布链路，代码与依赖保持 7.4 时代原样。详见文末
> [冻结说明](#冻结说明80)。

./upload POST 指定上传文件构建字体。

```json
{
    "file_folder":"/temp/template2/",
    "file_url":"https://jsdelivr.deno.dev/gh/KonghaYao/cn-font-split/packages/demo/public/SmileySans-Oblique.ttf"
}
```

./assets 目录直接保存构建产物，`file_folder` 为文件名。

## Token 算法

```js
// 10s 过期的 token
sha256(token + Math.floor(Date.now()/10000))
```

## 冻结说明（8.0）

`packages/server` 在本轮翻新中被显式冻结：它自带 `Cargo.toml` + `Cargo.lock` 与
`[workspace]`，并被根 `Cargo.toml` 的 `exclude` 排除，不进入 workspace 构建、CI
与任何发布 workflow。冻结的事实与原因：

| 项 | 现状 | 为什么不跟进 8.0 |
| --- | --- | --- |
| `cn-font-split` 依赖 | crates.io `7.4.0`（非 workspace path 依赖） | 8.0 尚未发布到 crates.io；改用 path 依赖会让本包与 workspace 的 edition 2024 / MSRV 1.85 绑定，需要同时改代码 |
| `cn-font-proto` / `cn-font-utils` | crates.io `0.1.2` / `0.2.0` | 与 7.4.0 主库的 proto 定义配套；换成 8.0 的 proto 需要重新生成并适配 API |
| 构建镜像 | `Dockerfile` 固定 `rust:1.84.0-bullseye` | 1.84.0 **低于本仓库 MSRV 1.85**，只能构建冻结的 7.4 依赖；升级镜像等于放弃冻结 |
| 测试 | 无任何单元/集成测试（`src/` 内无 `#[test]`） | 冻结期间不补测试，避免对将废弃的实现投入 |

升级计划（在 8.x 正式发布后单独立项，不随本分支进行）：

1. `cn-font-split` 发布到 crates.io 后，把本包依赖改到 8.x，并同步
   `cn-font-proto` / `cn-font-utils` 的版本；
2. `Dockerfile` 基础镜像升到 `rust:1.85` 及以上（与 `rust-toolchain.toml` 对齐），
   重新跑一次 `docker build` 作为验收；
3. 补最小测试（`/upload` 的成功与失败路径）后再决定是否把本包纳入 workspace。

在此之前：`packages/server` 的构建产物**不保证可用**，`release-cn-font-server.yml`
只构建镜像（`publish=false`），不参与 npm 发布。
