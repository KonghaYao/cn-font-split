# cn-font-split 的 ffi 构建项目

目标： 构建多平台支持的 FFI 二进制产物。交叉构建产物以 `bindings-<triple>` artifact 形式上传（保留 14 天）；仅在 `create_release=true` 时创建 draft release。

CICD： Github action `.github/workflows/cross-build.yml`

目标需要广泛支持 wasm、Windows、Linux、MacOS 平台，保证极高的运行效率。

