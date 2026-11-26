# 配置与默认值

8.0 起，核心的配置只有一个真相来源：`src/config.rs` 的 `Config`。

- `InputTemplate`（`crates/proto/src/index.proto`）只是跨语言 **wire IR**：
  它描述调用方传了什么，不承载默认值与校验语义。
- `Config::from_template(&InputTemplate) -> Result<Config>` 负责解析与入口校验，
  缺省字段在这里落地成默认值；
- `Config::to_template() -> InputTemplate` 把已解析配置回写成 wire IR，
  供 CLI / FFI 交给 `font_split`；
- `font_split` 内部先 `from_template`，之后 `pre_subset` / `run_subset` /
  `link_subset` 只读 `Config`，不再各自 `unwrap_or`。

默认值改动流程：改 `src/config.rs` → 同步本表与 `tests/config_defaults.rs`，
否则一致性测试失败。

## 默认值表

`InputTemplate` 的字段都是 `optional`；下表列出「未给出」时的最终取值。

| 字段                          | 默认值                 | 说明                                                        |
| ----------------------------- | ---------------------- | ----------------------------------------------------------- |
| `chunk_size`                  | `71680`（70 KiB）      | 每个分包的压缩后目标字节数；`<= 0` 在入口返回 `InvalidConfig` |
| `chunk_size_tolerance`        | `0.0`                  | **尚未实现**：只接受 `0.0`，非 0 值返回 `InvalidConfig`      |
| `max_allow_subsets_count`     | 未设置                 | 当前只校验 `> 0`，不参与计算                                |
| `test_html`                   | `true`                 | 输出 `index.html`                                           |
| `reporter`                    | `true`                 | 输出 `reporter.bin`                                         |
| `preview_image`               | 未设置                 | 给出时在预处理阶段输出预览 SVG                              |
| `rename_output_font`          | 未设置                 | 未给出时文件名用 `{blake3}.woff2`                           |
| `build_mode`                  | `default`              | 只接受省略、空串或 `"default"`，其他值返回 `InvalidConfig`   |
| `subsets`                     | 空                     | 每字符 4 字节小端；长度非 4 的倍数返回 `InvalidSubsets`      |
| `language_areas`              | `true`                 | 按语言区域拆分剩余字符                                      |
| `multi_threads`               | `true`                 | `false` 时顺序构建分包（结果相同，耗时更长）                 |
| `font_feature`                | `true`                 | 把 GSUB/GPOS 涉及的字符并回分包                             |
| `reduce_mins`                 | `false`                | 合并碎片分包（算法未调优，默认关闭）                        |
| `auto_subset`                 | `true`                 | 按 `chunk_size` 自动切分                                    |
| `subset_remain_chars`         | `true`                 | 未声明的字符自动成包                                        |

### CSS（`InputTemplate.CssProperties`）

| 字段                  | 默认值                | 说明                                         |
| --------------------- | --------------------- | -------------------------------------------- |
| `font_family`         | 未设置                | 回退顺序：name 表 `FontFamilyName` → `default_font_family` |
| `font_weight`         | 未设置                | 回退顺序：name 表 → 可变字体权重范围 → `400`  |
| `font_style`          | 未设置                | 子族名含 `italic` 时为 `italic`，否则 `normal` |
| `font_display`        | `swap`                |                                              |
| `local_family`        | 空（用 `font_family`）| 本地字体来源                                 |
| `polyfill`            | 空                    | 额外 `src` 项                                |
| `comment_base`        | `true`                | 生成头部注释（含版本与生成时间）             |
| `comment_name_table`  | `true`                | 注释中附 name 表                             |
| `comment_unicodes`    | `false`               | 每个 `@font-face` 前的 Unicode 注释          |
| `compress`            | `true`                | 压缩 CSS（去掉换行与缩进）                   |
| `file_name`           | `result.css`          | CSS 产物文件名                               |

## 校验（`Config::from_template`）

按以下顺序执行，错误 variant 与 8.0 之前一致：

| 条件                                  | 错误                                   |
| ------------------------------------- | -------------------------------------- |
| `input` 为空                          | `FontSplitError::EmptyInput`           |
| 任一 `subsets[i]` 长度不是 4 的倍数   | `FontSplitError::InvalidSubsets(..)`   |
| `chunk_size` 给出且 `<= 0`            | `FontSplitError::InvalidConfig(..)`    |
| `max_allow_subsets_count` 给出且 `<= 0` | `FontSplitError::InvalidConfig(..)`  |
| `chunk_size_tolerance` 给出且非 `0.0` | `FontSplitError::InvalidConfig(..)`    |
| `build_mode` 不是省略/空串/`"default"` | `FontSplitError::InvalidConfig(..)`    |

### `chunk_size_tolerance` 为什么直接拒绝

该字段的完整语义是「按实测体积迭代分包」，需要新的分包算法（计划 §A.4），
目前尚未实现。静默忽略会让调用方误以为包体积受控，因此非 `0.0` 值一律在
入口返回 `InvalidConfig`，错误文案提示「请置 0」。默认值 `0.0` 不受影响。

### `build_mode` 的取值

内部类型是枚举 `config::BuildMode`，当前只有 `Default` 一种：
wire IR 里的 `None`、空串与 `"default"` 都解析为它，其他值返回
`InvalidConfig` 并在文案中列出允许值。保留该字段是为了将来加入预设模式时
不改 wire 协议。

### `multi_threads`

`true`（默认）用 rayon 并行构建分包，`false` 用顺序 `for` 循环。两条路径
共用同一个 `run_subset::build_one`，因此**输出文件名、文件顺序、字节内容与
reporter 内容完全一致**，只有耗时字段（`SubsetDetail.duration`）不同。
单线程宿主（wasm、受限容器）可关掉它避免线程池开销。

## wire IR 中不进入 `Config` 的字段

`InputTemplate.out_dir` / `target_type` 由调用方（CLI、FFI 外壳）自行使用，
核心只读取 `input` 数据，因此 `Config` 不保存这两个字段，
`to_template()` 回写时留空。

## 不进入 `Config` 的取值

以下回退依赖字体本身，运行时才能得出，因此不放进配置表：

- name 表缺失时的字体家族名（`default_font_family`）与字重/样式推导；
- 未给出 `rename_output_font` 时的 `{blake3}.woff2` 文件名；
- 预览 SVG 未命名时的 `preview.svg`。
