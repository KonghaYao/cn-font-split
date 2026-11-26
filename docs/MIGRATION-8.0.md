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
-   阶段之间改为共享 `FontSource` / `PreSubsetOutput` / `RunSubsetOutput` /
    `LinkSubsetOutput`（crate 私有的 `contract` 模块，不再对外导出）；
-   三段签名为 `pre_subset(&mut FontSource, &Config)`、
    `run_subset(&FontSource, &Config, &PreSubsetOutput)`、
    `link_subset(&Config, &PreSubsetOutput, &RunSubsetOutput)`，各自返回对应产物；
-   `gen_svg_from_ctx` 改为 `gen_svg_extra_files(&Config, &Face)`，只返回待输出的
    `(文件名, 内容)` 列表，不再自行 emit；
-   对外只导出 `font_split`、`EventFactory`、`FontSplitError` / `Result` 与
    `config`（`Config`、`BuildMode` 等），其余模块均为 crate 私有。

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

#### 配置字段：从「静默忽略」改为「显式拒绝/生效」（breaking）

8.0 之前下列字段不参与计算，传什么都被静默忽略；8.0 起：

| 字段 | 8.0 行为 |
| ---- | -------- |
| `chunk_size_tolerance` | 只接受 `0.0`；**任何非 0 值返回 `FontSplitError::InvalidConfig`**，文案提示「尚未实现，请置 0」。完整语义（按实测体积迭代分包）尚未实现。 |
| `build_mode` | 收为枚举，只接受省略 / 空串 / `"default"`；其他值返回 `InvalidConfig` 并列出允许值。 |
| `multi_threads` | `true`（默认）并行构建，`false` 顺序构建（`run_subset` 改为顺序 `for`）。**产物与并行路径逐字节一致**，只有 reporter 里的 `duration` 不同；单线程宿主建议设为 `false`。 |
| `max_allow_subsets_count` | 行为不变：仍只校验 `> 0`，不参与分包预测。 |

迁移方式：删除或置零旧配置里的 `chunkSizeTolerance` / `chunk_size_tolerance`，
并把 `buildMode` / `build_mode` 去掉或改为 `"default"`。TS 类型仍允许任意字符串，
因此非法值只会在调用 `fontSplit()` 时以 `InvalidConfig` 报错。

```diff
 await fontSplit({
     input,
     outDir,
-    chunkSizeTolerance: 1 * 1024,
-    buildMode: 'fast',
+    // 8.0：容差语义未实现，只能为 0；build_mode 只支持 'default'
+    multiThreads: false,
 });
```

## 5. 移除的运行期依赖

-   **`set-value`** 已移除（不再做深层属性赋值）。
-   **`google-protobuf`** 已移除，JS 侧的 proto 运行时换成 **`@bufbuild/protobuf`
    2.17.0**（生成器 `@bufbuild/protoc-gen-es` 与运行时锁同一版本）。见 5.1。
-   `postinstall` 脚本与 `init` CLI 命令一并移除。

### 5.1 JS proto 运行时：google-protobuf → @bufbuild/protobuf（breaking）

生成的 `src/gen/index.ts`（protoc-gen-ts）替换为 `src/gen/index_pb.ts`
（`protoc --es_out`，`target=ts`）。`@bufbuild/protobuf` 是 `cn-font-split` 的运行时
`dependencies`，调用方无需额外安装。

调用 API 对照：

| 旧（google-protobuf / protoc-gen-ts） | 新（@bufbuild/protobuf 2.17） |
| ------------------------------------- | ----------------------------- |
| `InputTemplate.fromObject(obj)`       | `create(InputTemplateSchema, obj)`，入参即 `MessageInitShape<typeof InputTemplateSchema>` |
| `msg.serialize()`                     | `toBinary(InputTemplateSchema, msg)` |
| `InputTemplate.deserialize(bytes)`    | `fromBinary(InputTemplateSchema, bytes)` |
| `EventMessage.deserialize(bytes)`     | `fromBinary(EventMessageSchema, bytes)` |
| `report.toObject()`                   | `reporterToJSON(report)`（`cn-font-split` 导出，返回 proto3 JSON 映射的普通对象） |
| `OriginInput`                         | `MessageInitShape<typeof InputTemplateSchema>` |
| `FontReporter`                        | `OutputReport`（消息对象，不再是 `toObject()` 的普通对象） |

`proto` 命名空间里的公开类型名对照（同名枚举与 `FontSplitProps` 不变）：

| 旧                                  | 新                                                  |
| ----------------------------------- | --------------------------------------------------- |
| `proto.OutputReport.SubsetDetail`   | `proto.OutputReport_SubsetDetail`                   |
| `proto.OutputReport.NameTable`      | `proto.OutputReport_NameTable`                      |
| `proto.OutputReport.BundleMessage`  | `proto.OutputReport_BundleMessage`                  |
| `proto.OutputReport.Css`            | `proto.OutputReport_Css`                            |
| `proto.InputTemplate.CssProperties` | `proto.InputTemplate_CssProperties`                 |
| `proto.InputTemplate.PolyfillType`  | `proto.InputTemplate_PolyfillType`                  |
| `proto.InputTemplate.PreviewImage`  | `proto.InputTemplate_PreviewImage`                  |
| `proto.InputTemplate` / `proto.OutputReport`（class） | 同名**类型** + `InputTemplateSchema` / `OutputReportSchema` 常量 |
| `proto.EventMessage` / `proto.MultiMessages`（class） | 同名**类型** + `EventMessageSchema` / `MultiMessagesSchema` 常量 |
| `proto.EventName`                   | `proto.EventName`（枚举值不变）                     |
| `proto.font_services`（gRPC client）| 已删除：`src/gen/services.ts` 既未导出也未参与打包，`services.proto` 不再生成到 JS |

```diff
-import { proto } from 'cn-font-split';
-const detail: proto.OutputReport.SubsetDetail = report.subsetDetail[0];
+import { proto, reporterToJSON } from 'cn-font-split';
+const detail: proto.OutputReport_SubsetDetail = report.subsetDetail[0];
+const plain = reporterToJSON(report); // 等价于旧版的 report.toObject()
```

行为差异（wire 兼容，Rust 侧解码不受影响）：

-   未设置的 `optional` 字段返回 `undefined`，旧实现返回 proto 默认值
    （`''` / `0` / `false`；消息字段旧版同样是 `undefined`）。例如 `css` 子消息
    存在但未设置 `compress` 时，`css.compress` 从 `false` 变成 `undefined`。
-   `EventMessage.data` 未设置时为 `undefined`（旧实现是空 `Uint8Array`）。
    `fontSplit()` 内部已兜底为空字节。
-   序列化字段顺序由「proto 声明顺序」改为「字段编号升序」。真正会变化的是
    `CssProperties.compress/file_name`（声明在 11/12/13 之后）与
    `InputTemplate.language_areas`（声明在 20 之后）这两处；字段值完全一致。
-   wasm 入口：`input` 为字符串时显式报错（旧版会把它塞进 `bytes` 字段，写出乱码）；
    `subsets` 现在与 FFI 入口一致地按 `Uint32Array` 转成字节（旧版把
    `number[][]` 原样写入，同样是乱码）。
-   `subsets` 仍是 `number[][]` → `Uint8Array[]` 的转换，入参类型不变。

## 6. 产物与 CSS

-   分包数量与字节数总体持平：默认配置下 SmileySans WOFF2 为 59 → 63 个包
    （+6.8%，字节 +0.32%）；12 个 benchmark 用例合计 1020 → 992 个包、总字节 −0.25%。
    视觉结果不变（回归三组 `0.000%`）。
-   生成 CSS 的结构与字段不变；`css.*` 配置照常传入。
-   `reporter.bin` 仍通过 `EventName.OutputData` 发出，`reporter: false` 可关闭。

## 7. 检查清单

-   [ ] Node 升级到 22+，pnpm 升级到 12。
-   [ ] 删除自定义 `postinstall` / `cn-font-split init` 调用。
-   [ ] 确认平台包能被安装；离线环境配置 `CN_FONT_SPLIT_BIN`。
-   [ ] 更新对 md5 文件名（32 hex）的假设与缓存键。
-   [ ] JS 侧为 `fontSplit()` 增加 `try/catch`；Rust 侧处理 `Result`。
-   [ ] 如果监听事件流，增加 `EventName.Error`（值 `3`）分支。
-   [ ] 如果直接用 `proto.OutputReport.SubsetDetail` 等生成类型，按 5.1 的类型对照改名。
-   [ ] 如果直接依赖 `runner::Context` / `create_context` / `gen_svg_from_ctx`，
        改为消费 `font_split` 的事件流（这些符号 8.0 已删除或改名）。
-   [ ] 删除 `chunkSizeTolerance` / `chunk_size_tolerance`（非 0 会报
        `InvalidConfig`）；`buildMode` / `build_mode` 只保留 `"default"` 或删除。

## 8. 回滚建议

-   8.0 未实际发布；如需回滚，把依赖固定回 `7.x` 的最新可用版本，并恢复
    `postinstall` 时代的安装方式。
-   不要混用 7.x 与 8.0 的产物：指纹长度与算法不同，缓存/清单会失效。
-   回滚前保留 `reporter.bin` 与 `result.css`，便于对比分包与字符覆盖。
