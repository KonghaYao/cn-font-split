# cn-font-split Rust Version

## cn-font-split 代码架构

cn-font-split 是一个复杂的字体分包系统，整体架构分为三个主要部分：core、message_channel 和 wrapper。

### 1. Core 核心层

core 是 cn-font-split 的核心部分，负责实际的字体分包操作。它通过接收回调函数作为参数，实现异步数据返回。

> font_split 现在为同步实现，速度足够快。异步数据返回这种形式可兼容不同的信道层实现。

core 内部主要包含以下三个核心逻辑模块：

- 预分包（pre_subset）：在进行实际分包操作之前，预处理字体数据，进行多语言的分包优化，确定分包内字符。
- 批量分包（run_subset）：处理大批量字体数据的分包操作，确保在高负载情况下依然能够高效运行。
- 链接分包（link_subset）：将分包后的字体数据进行链接、整合和汇报，生成最终的分包结果。

这些操作基于 harfbuzz 和 opentype 库实现，确保了对字体操作的高效和准确。

### 2. Message Channel 信道层

message_channel 是 cn-font-split 与外部系统交互的桥梁，基于 protobuf（Protocol Buffers）实现。所有的交互接口通过 cn-font-proto 库进行定义和创建。

protobuf 在现实实现中，有两种使用方式：

1. 结构体传递: Rust 程序间进行沟通时，直接采用 protobuf 代码生成的定义。
2. 二进制数据传递：不同语言之间，通过 protobuf 的，和任何一种可以传递二进制的信道进行数据同步。

### 3. Wrapper 适配层

wrapper 是 cn-font-split 对外提供的功能接口，支持多种语言调用和不同的部署方案。wrapper 主要包括以下几种实现：

- ✅ gRPC Wrapper：基于 HTTP/2 协议，提供独立的字体构建服务。gRPC 方案简单易用，适用于所有支持 gRPC 的项目。
- ✅ FFI Wrapper：通过标准的 C API 调用 Rust 生成的二进制动态链接库，使用 protobuf 解析二进制数据，支持双边语言通信。
- ✅ CLI Wrapper：提供一个命令行接口，完全由 Rust 编写，用户可以通过简单的命令完成基础的字体分包操作。
- ✅ WASI Wrapper：基于 WebAssembly System Interface (WASI)，支持在多种操作系统环境中运行，提供更广泛的部署可能性。
  - 浏览器可以通过 WASI（@tybys/wasm-util）实现完成接入。

## 开发规范

### 命名规范

1. Rust 项目统一采用 snake_case, 会有 IDE 相应提示。

2. 包名统一用 `-` 链接，而不是 `_`。

### 开发环境

为统一不同开发环境，采用 VSCode Dev Container 方法

开发使用设备最好 MacOS 8GB、Windows 16GB 以上, 具备 Docker 环境，一键进入开发状态！

如果遇到某些依赖没安装，可以参考 [Developer.md](./Developer.md)

### 测试流程
