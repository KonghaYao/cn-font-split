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
