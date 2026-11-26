# cn-font-split 8.0 迁移指南

8.0 是 breaking release。核心切割行为与视觉产物保持一致，但**安装方式、错误模型、
指纹算法与最低运行环境**有变化。请按下文逐项检查。

## 1. 版本与工具链

| 项                   | 7.x                    | 8.0                                     |
| -------------------- | ---------------------- | --------------------------------------- |
| 核心与所有对外包版本 | 7.4.x / 7.6.x 混用     | 统一 `8.0.0`                            |
| Node.js              | 18                     | **>= 22**                               |
| pnpm                 | 8/9                    | **12**（`packageManager: pnpm@12.6.0`） |
| Rust MSRV            | 未声明（edition 2021） | **1.85**（edition 2024）                |

升级后请先确认 CI 与本地 Node 版本：

```sh
node -v   # 需要 v22+
pnpm -v   # 需要 12.x
```

## 2. 安装方式：改为平台包（breaking）

7.x 在 `postinstall` 阶段从 GitHub Releases 下载二进制，安装期依赖网络与代理。
8.0 改为 npm `optionalDependencies`：

```json
{
    "dependencies": {
        "cn-font-split": "8.0.0"
    }
}
```

`cn-font-split` 会按 `os` / `cpu` 自动安装对应平台包，例如
`@cn-font-split/darwin-arm64`、`@cn-font-split/win32-x64-msvc`、
`@cn-font-split/linux-x64-gnu`。

-   不再有 `postinstall`，**也不再支持 `cn-font-split init` 命令**。7.x 中用于
    预下载/修复二进制的 `init` 已删除。
-   若使用私有 registry 或平台包安装失败，用 `CN_FONT_SPLIT_BIN` 指向自编译动态库：

    ```sh
    CN_FONT_SPLIT_BIN=/opt/font/libffi.so cn-font-split -i font.ttf -o dist
    ```

-   musl、BSD、32 位等无预编译包的平台只能使用 `CN_FONT_SPLIT_BIN`。

## 3. 指纹：md5 → blake3（breaking）

-   输出文件名从 md5（32 位 hex）变为 **blake3（64 位小写 hex）**。
-   `renameOutputFont` 模板语法保持不变：`[hash:6]` 仍然合法，只是哈希来源变为
    blake3，因此**截断后的 6 位也会变化**。
-   `[hash]`、`[blake3]`、`[md5]` 都映射到同一个 blake3 值；保留 `[md5]`
    只是为了让旧模板不报错，它不会再计算 md5。

迁移方式：

```diff
- // 7.x：文件名形如 3f2a1b9c8d....woff2（32 hex）
+ // 8.0：文件名形如 9a0c...（64 hex）
```

如果下游用文件名做长期缓存，请把缓存键改为新的 64 位指纹，或改用内容哈希。
需要稳定文件名时显式设置模板：

```js
await fontSplit({
    input,
    outDir,
    renameOutputFont: 'subset-[index]-[hash:6].woff2',
});
```

回滚：8.0 不提供 md5 开关。确需回滚缓存键时请整体降级到 7.x（见第 8 节），
不要混用两代产物。

## 4. 错误模型：EventName.Error + Result（breaking）

### JS

7.x 在部分失败路径会 panic 或只打印日志。8.0 保证：

-   失败时 `fontSplit()` 返回的 Promise **reject**，`err.message` 是结构化错误文本；
-   FFI 进程不会 abort，错误之后仍可继续调用同一个库实例。

```js
try {
    await fontSplit({ input, outDir });
} catch (err) {
    // 8.0：错误文本可读，例如「无法解析字体: ...」
    console.error('font split failed:', err.message);
}
```

### Rust

`font_split` 从 `()` 改为 `Result<()>`；失败时会**先**通过回调发送
`EventName::Error` 事件，**再**返回 `Err(FontSplitError)`：

```rust
use cn_font_proto::api_interface::{EventMessage, EventName};
use cn_font_split::{font_split, FontSplitError};

let result = font_split(config, |event: EventMessage| {
    match event.event {
        // 3 == EventName::Error
        e if e == EventName::Error as i32 => eprintln!("error: {}", event.message),
        _ => {}
    }
});

if let Err(FontSplitError::InvalidConfig(msg)) = result {
    eprintln!("配置错误: {msg}");
}
```

新增 `FontSplitError` 变体：`EmptyInput`、`InvalidWoff2`、`InvalidFont`、
`InvalidSubsets`、`InvalidConfig`、`Io`、`Internal`。原来依赖 panic 文本的
兼容代码需要改为匹配错误枚举。

#### 管线内部 API：`runner::Context` 已删除（breaking）

8.0 把管线拆成阶段产物，不再对外暴露带 `&mut face` / `&mut reporter` /
`callback` 的可变上下文：

-   `runner::Context` 与 `runner::create_context` **已删除**，不保留兼容别名；
-   替代类型：`runner::FontSource<'a>`（输入）、`runner::PreSubsetOutput`、
    `runner::RunSubsetOutput`、`runner::LinkSubsetOutput`（三段产物）；
-   三段签名为 `pre_subset(&mut FontSource, &Config)`、
    `run_subset(&FontSource, &Config, &PreSubsetOutput)`、
    `link_subset(&Config, &PreSubsetOutput, &RunSubsetOutput)`，各自返回对应产物；
-   `gen_svg_from_ctx` 改为 `gen_svg_extra_files(&Config, &Face)`，只返回待输出的
    `(文件名, 内容)` 列表，不再自行 emit。

Rust 使用者不应再构造上下文或手工串联三段，改为消费 `font_split` 的事件流：

```rust
use cn_font_proto::api_interface::EventMessage;
use cn_font_split::font_split;

font_split(config, |event: EventMessage| {
    // OutputData：文件名在 event.message，内容在 event.data；
    // End / Error 的处理见上文错误模型。
})?;
```

确需单独调用某个阶段时，按 `src/runner.rs` 中 `font_split_inner` 的组合方式
传递阶段产物，并自行负责 `OutputData` 事件与 `reporter.bin` 的组装。

## 5. 移除的运行期依赖

-   **`set-value`** 已移除（不再做深层属性赋值）。
-   **`google-protobuf`** 不再用于解析配置事件；TS 侧使用入库的生成代码。
    若你直接依赖 `cn-font-split` 的内部 proto 运行时，请改用导出的
    `proto` / `FontSplitProps` 类型。
-   `postinstall` 脚本与 `init` CLI 命令一并移除。

## 6. 产物与 CSS

-   分包数量、单包字节与视觉结果与 7.x 基线一致（视觉回归三组 `0.000%`）。
-   生成 CSS 的结构与字段不变；`css.*` 配置照常传入。
-   `reporter.bin` 仍通过 `EventName.OutputData` 发出，`reporter: false` 可关闭。

## 7. 检查清单

-   [ ] Node 升级到 22+，pnpm 升级到 12。
-   [ ] 删除自定义 `postinstall` / `cn-font-split init` 调用。
-   [ ] 确认平台包能被安装；离线环境配置 `CN_FONT_SPLIT_BIN`。
-   [ ] 更新对 md5 文件名（32 hex）的假设与缓存键。
-   [ ] JS 侧为 `fontSplit()` 增加 `try/catch`；Rust 侧处理 `Result`。
-   [ ] 如果监听事件流，增加 `EventName.Error`（值 `3`）分支。
-   [ ] 如果直接依赖 `runner::Context` / `create_context` / `gen_svg_from_ctx`，
        改为消费 `font_split` 的事件流（这些符号 8.0 已删除或改名）。

## 8. 回滚建议

-   8.0 未实际发布；如需回滚，把依赖固定回 `7.x` 的最新可用版本，并恢复
    `postinstall` 时代的安装方式。
-   不要混用 7.x 与 8.0 的产物：指纹长度与算法不同，缓存/清单会失效。
-   回滚前保留 `reporter.bin` 与 `result.css`，便于对比分包与字符覆盖。
