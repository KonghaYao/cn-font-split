# cn-font-split Rust Version!

cn-font-split 代码架构

1. Lanuage Interface （提供外部 file system 等 API封装）
    1. Rust carate
    2. Cli
    3. Wasm
        1. JS API
2. Binary API Port （提供跨语言的二进制交互机制）
    1. Protobuf
    2. Rust prost
    3. stream data return
3. Rust Program （提供快速的 Rust 分包服务）
    1. InputParams decode
    2. PreSubset
    3. RunSubset
    4. CssLinker
    5. Analyzer

## 命名规范

1. 统一采用 snake_case, 不论文件名或文件夹、模块名、变量、函数名

2. 包名统一用 `-` 链接，而不是 `_`。

## Dev

开发使用设备最好 MacOS 8GB 以上

```sh
apt update -y
apt install -y protobuf-compiler && protoc --version
```